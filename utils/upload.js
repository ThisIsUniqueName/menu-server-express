// utils/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// 配置项
const config = {
  uploadDir: 'public/uploads',
  thumbnailDir: 'public/uploads/thumbnails',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  imageSizes: {
    thumbnail: { width: 300, height: 300, fit: 'cover' },
    medium: { width: 800, height: 600, fit: 'inside' }
  }
};

// 创建上传目录结构
function createDirectories() {
  const dirs = [config.uploadDir, config.thumbnailDir];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
createDirectories();

// 存储引擎配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

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

// 图片处理器中间件
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next();

  try {
    req.processedFiles = await Promise.all(
      req.files.map(async file => {
         // 添加文件存在性检查
         if (!file || !file.path) throw new Error('文件上传失败');
        
        const originalPath = path.join(config.uploadDir, file.filename);
        const thumbnailPath = path.join(config.thumbnailDir, file.filename);

        // 生成缩略图
        await sharp(originalPath)
          .resize(config.imageSizes.thumbnail.width, config.imageSizes.thumbnail.height, {
            fit: config.imageSizes.thumbnail.fit
          })
          .toFile(thumbnailPath);

        // 生成中等尺寸图片
        const mediumPath = path.join(config.uploadDir, `medium_${file.filename}`);
        await sharp(originalPath)
          .resize(config.imageSizes.medium.width, config.imageSizes.medium.height, {
            fit: config.imageSizes.medium.fit
          })
          .toFile(mediumPath);

        return {
          original: `/uploads/${file.filename}`,
          thumbnail: `/uploads/thumbnails/${file.filename}`,
          medium: `/uploads/medium_${file.filename}`
        };
      })
    );

    next();
  } catch (error) {
    // 清理已上传文件
    req.files.forEach(file => {
      fs.unlinkSync(file.path);
    });
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

// 导出中间件
module.exports = {
  // 单图上传（用于封面）
  singleUpload: [
    baseUpload.single('cover'),
    async (req, res, next) => {
      if (!req.file) return next();
      try {
        const processed = await processImages({ files: [req.file] }, res, next);
        req.coverImage = processed[0];
        next();
      } catch (error) {
        next(error);
      }
    }
  ],

  // 多图上传（用于步骤图片）
  multiUpload: createUpload('images', 10),

  // 错误处理中间件
  handleUploadErrors: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: '文件大小超过限制',
          maxSize: `${config.maxFileSize / 1024 / 1024}MB`
        });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(500).json({ error: '文件处理失败' });
    }
    next();
  }
};