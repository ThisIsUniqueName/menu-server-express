const Minio = require('minio');

// 初始化MinIO客户端
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

// 存储桶初始化逻辑
const initBucket = async () => {
  const bucketName = process.env.MINIO_BUCKET;
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`存储桶 ${bucketName} 创建成功`);
    }
  } catch (err) {
    console.error('存储桶初始化失败:', err);
    throw err;
  }
};

module.exports = { minioClient, initBucket };