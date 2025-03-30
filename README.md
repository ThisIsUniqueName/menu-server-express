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