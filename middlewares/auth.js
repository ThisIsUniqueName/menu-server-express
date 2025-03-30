
const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  try {
    // 1. 从Authorization头提取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: '未提供访问令牌' });
    }

    // 2. 验证Bearer格式
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      return res.status(401).json({ error: '令牌格式错误' });
    }

    // 3. 验证token有效性
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. 查询关联用户
    const user = await User.findByPk(decoded.userId, {
      attributes: ['id', 'name', 'role']
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在或已被删除' });
    }

    // 5. 附加用户信息到请求对象
    req.user = {
      id: user.id,
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('认证失败:', error);
    
    const errorMessage = error.name === 'TokenExpiredError' 
      ? '令牌已过期'
      : '无效的访问令牌';

    res.status(401).json({ 
      error: errorMessage,
      detail: error.message 
    });
  }
};
