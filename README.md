# 菜谱小程序后端服务

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.x-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

基于Node.js的菜谱管理后端服务，提供完整的RESTful API接口，支持用户认证、菜谱管理、标签分类、食材管理等功能。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
  - [环境要求](#环境要求)
  - [安装步骤](#安装步骤)
  - [配置说明](#配置说明)
- [API文档](#api文档)
- [数据库设计](#数据库设计)
- [部署指南](#部署指南)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 功能特性

- ​**用户系统**
  - JWT令牌认证
  - 注册/登录/登出
  - 角色权限管理
  - 头像上传
  
- ​**菜谱管理**
  - 多条件检索与分页
  - Markdown格式步骤说明
  - 封面图片上传
  - 难度/耗时/热量统计
  
- ​**标签系统**
  - 多级标签分类
  - 菜谱标签关联
  - 热门标签推荐
  
- ​**食材管理**
  - 食材分类管理
  - 用量智能提示
  - 替代食材建议

## 技术栈

**后端框架**
- Node.js v18+
- Express.js
- Sequelize ORM

**数据库**
- MariaDB 10.6+
- Redis 6+ (缓存)

**安全认证**
- JWT
- bcrypt 密码哈希
- Helmet 安全中间件

**文件存储**
- Multer 文件上传
- 本地文件存储（可扩展至云存储）

**其他工具**
- Winston 日志系统
- Jest 单元测试
- Swagger API文档

## 快速开始

### 环境要求
- Node.js 18.x
- MariaDB 10.6+
- Redis 6.2+
- Git 2.36+

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/ThisIsUniqueName/menu-server-express.git
cd menu-server

2. 安装依赖
npm install

3. 环境配置
cp .env.example .env
# 编辑.env文件配置数据库等信息

4. 数据库迁移
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

5. 启动服务
npm run dev


配置说明

.env 文件示例
# 服务器配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_NAME=menu_db
DB_USER=root
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=3306

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=2h

# 文件上传
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5MB

API文档

主要接口示例

用户注册
POST /api/auth/register
Content-Type: application/json

{
  "name": "user123",
  "password": "StrongP@ssw0rd"
}

菜谱创建

POST /api/recipes
Authorization: Bearer <your_jwt_token>
Content-Type: multipart/form-data

- dish_name: 红烧肉
- summary_time: 90
- steps: [{"order":1,"desc":"焯水处理"},...]
- cover: (文件上传)

标签检索
GET /api/tags?q=家常菜&page=1
完整API文档参见 

核心表结构：
CREATE TABLE Recipes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dish_name VARCHAR(255) NOT NULL,
  cover_url VARCHAR(512),
  summary_time INT,
  author_id INT REFERENCES Users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

部署指南
生产环境部署建议

使用PM2进行进程管理
配置Nginx反向代理
启用HTTPS
定期数据库备份
日志轮转配置

Docker部署

