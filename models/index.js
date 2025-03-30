const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const db = {};

// 添加调试日志
console.log('✅ 数据库连接实例类型:', typeof sequelize);
console.log('🔍 开始加载模型文件...');

fs.readdirSync(__dirname)
  .filter(file => {
    const isModelFile = 
      file !== 'index.js' &&
      file.slice(-3) === '.js';
    
    console.log(`📄 扫描文件: ${file} → ${isModelFile ? '加载' : '忽略'}`);
    return isModelFile;
  })
  .forEach(file => {
    const filePath = path.join(__dirname, file);
    console.log(`⏳ 正在加载模型: ${filePath}`);
    
    try {
      const modelModule = require(filePath);
      console.log(`🔧 导出类型检测: ${typeof modelModule}`);
      
      if (typeof modelModule !== 'function') {
        throw new Error(`模型文件 ${file} 必须导出函数`);
      }

      const model = modelModule(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
      console.log(`✅ 成功加载模型: ${model.name}`);
    } catch (error) {
      console.error(`❌ 加载失败: ${filePath}`, error);
      process.exit(1);
    }
  });

// 关联关系处理
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    console.log(`🔗 建立关联关系: ${modelName}`);
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

console.log('🎉 所有模型加载完成');
module.exports = db;