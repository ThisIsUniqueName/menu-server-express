const { Sequelize } = require('sequelize'); // 添加这行引入Sequelize
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mariadb', // 改为mariadb驱动
    dialectOptions: {
      connectTimeout: 60000 // 增加连接超时时间
    },
    logging: console.log
});

module.exports = sequelize;