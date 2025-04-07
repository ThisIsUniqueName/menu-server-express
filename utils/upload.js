// utils/upload.js
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { minioClient } = require('./minio');

// 配置项优化
const config = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  imageSizes: {
    thumbnail: { width: 300, height: 300, fit: 'cover' },
    medium: { width: 800, height: 600, fit: 'inside' }
  },
  minioBucket: process.env.MINIO_BUCKET || 'menu-images'
};

// 生成唯一文件名
const generateFileName = (originalName) => {
  const ext = originalName.split('.').pop().toLowerCase();
  return `${uuidv4()}.${ext}`;
};

// 内存存储配置
const storage = multer.memoryStorage();

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (config.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
};

// 创建基础上传实例
const baseUpload = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: fileFilter
});

// 图片处理器中间件（MinIO集成版）
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    req.processedFiles = await Promise.all(
      req.files.map(async (file) => {
        try {
          // 基础校验
          if (!file.buffer) throw new Error('文件内容为空');
          
          // 生成多尺寸图片
          const originalBuffer = await sharp(file.buffer)
            .resize(1920, 1080, { fit: 'inside' })
            .toBuffer();

          const thumbnailBuffer = await sharp(file.buffer)
            .resize(config.imageSizes.thumbnail.width, config.imageSizes.thumbnail.height)
            .toBuffer();

          const mediumBuffer = await sharp(file.buffer)
            .resize(config.imageSizes.medium.width, config.imageSizes.medium.height)
            .toBuffer();

          // 上传到MinIO
          const uploadFile = async (buffer, suffix = '') => {
            const objectName = generateFileName(file.originalname) + suffix;
            await minioClient.putObject(
              config.minioBucket,
              objectName,
              buffer,
              buffer.length,
              { 'Content-Type': file.mimetype }
            );
            return `${process.env.MINIO_PUBLIC_URL}/${config.minioBucket}/${objectName}`;
          };

          // 并行上传所有版本
          const [original, thumbnail, medium] = await Promise.all([
            uploadFile(originalBuffer),
            uploadFile(thumbnailBuffer, '_thumbnail'),
            uploadFile(mediumBuffer, '_medium')
          ]);

          return { original, thumbnail, medium };

        } catch (error) {
          console.error('图片处理失败:', {
            filename: file.originalname,
            error: error.message
          });
          throw error;
        }
      })
    );

    next();
  } catch (error) {
    next(error);
  }
};

// 上传中间件组合器
const createUpload = (fieldName, maxCount = 5) => {
  return [
    baseUpload.array(fieldName, maxCount),
    processImages
  ];
};

// 错误处理中间件增强
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const errors = {
      LIMIT_FILE_SIZE: {
        status: 413,
        message: `文件大小超过限制（最大 ${config.maxFileSize / 1024 / 1024}MB）`
      },
      LIMIT_FILE_COUNT: {
        status: 400,
        message: `超过最大文件数量限制`
      }
    };
    
    const errorConfig = errors[err.code] || { status: 400, message: err.message };
    return res.status(errorConfig.status).json({ error: errorConfig.message });
  }
  
  if (err) {
    console.error('上传系统错误:', {
      error: err.stack,
      body: req.body
    });
    return res.status(500).json({ error: '文件处理系统异常' });
  }
  
  next();
};

module.exports = {
  singleUpload: [
    baseUpload.single('cover'),
    processImages,
    (req, res, next) => {
      if (req.file) req.coverImage = req.processedFiles[0];
      next();
    }
  ],
  multiUpload: createUpload('images', 10),
  handleUploadErrors
};