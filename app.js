const express = require('express');
const cors = require('cors');
const { createTerminus } = require('@godaddy/terminus');
const db = require('./models');
const authRouter = require('./routes/auth');
const recipesRouter = require('./routes/recipes');
const ingredientsRouter=require('./routes/ingredients')
console.log('✅ recipesRouter 类型:', typeof recipesRouter); // 应该输出 "function"
console.log('✅ ingredientsRouter 类型:', typeof ingredientsRouter); // 应该输出 "function"
const authMiddleware = require('./middlewares/auth');
console.log('✅ authRouter 类型:', typeof authRouter); // 应该输出 "function"

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));


// 路由配置
app.use('/api/auth', authRouter);// 受保护路由示例
app.use('/api/recipes', authMiddleware, recipesRouter);

app.use('/api/ingredients', ingredientsRouter);

// 错误处理

app.use((err, req, res, next) => {
    if (!res.headersSent) {
      console.log("res:",res)
      res.status(500).json({
        error: '服务器内部错误',
        detail: process.env.NODE_ENV === 'development' ? err.stack : null
      });
    }
  });

// 数据库连接
db.sequelize.authenticate()
  .then(() => {
    console.log('🔌 数据库连接成功');
    return db.sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('🔄 数据库表结构已同步');
    
    // 启动服务并获取server实例
    const server = app.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 服务已启动: http://localhost:${server.address().port}`);
    });

    // 健康检查配置
    createTerminus(server, {
      signals: ['SIGINT', 'SIGTERM'],
      healthChecks: {
        '/healthcheck': async () => {
          return db.sequelize.authenticate()
            .then(() => ({ status: 'ok' }))
            .catch(() => ({ status: 'error' }));
        }
      },
      onSignal: async () => {
        console.log('🔌 关闭数据库连接');
        await db.sequelize.close();
      }
    });
  })
  .catch(error => {
    console.error('💥 启动失败:', error);
    process.exit(1);
  });