const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 用户登录接口
router.post('/login', async (req, res) => {
    try {
        const { name, password } = req.body;

        // 验证必填字段
        if (!name?.trim() || !password?.trim()) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 查询用户（包含密码哈希）
        // 修改后（统一小写，并添加状态过滤）
        const user = await User.findOne({
            where: {
                name: name.trim().toLowerCase(), // 统一转为小写
                status: 'active' // 明确过滤活跃用户
            },
            attributes: ['id', 'name', 'password', 'role', 'status']
        });
        // 用户状态检查
        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: '用户不存在或已被禁用' });
        }


        // 验证密码
        const isValid = await bcrypt.compare(password.trim(), user.password);

                // 在密码验证部分添加日志
                console.log('输入密码:', password.trim());
                console.log('数据库哈希:', user.password);
                console.log('比对结果:', isValid);

        if (!isValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 生成访问令牌 (7天有效期)
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' }
        );

        // 返回响应（排除敏感字段）
        res.json({
            userId: user.id,
            name: user.name,
            role: user.role,
            token
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            error: '服务器内部错误',
            detail: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

// 用户注册接口（可根据需要添加）
// 用户注册接口
router.post('/register', async (req, res) => {
    try {
        const { name, password, role = 'user' } = req.body;

        // 验证必填字段
        if (!name?.trim() || !password?.trim()) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 验证密码复杂度
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(password.trim())) {
            return res.status(400).json({ 
                error: '密码必须至少8位，包含字母和数字'
            });
        }

        // 检查用户名是否已存在
        const existingUser = await User.findOne({
            where: { name: name.trim().toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({ error: '用户名已被注册' });
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        // 创建用户
        const newUser = await User.create({
            name: name.trim().toLowerCase(),
            password: hashedPassword,
            role: role.trim().toLowerCase(),
            status: 'active'
        });

        // 生成访问令牌
        const token = jwt.sign(
            { userId: newUser.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' }
        );

        // 返回响应（排除敏感字段）
        res.status(201).json({
            userId: newUser.id,
            name: newUser.name,
            role: newUser.role,
            token
        });

    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ 
            error: '注册失败',
            detail: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
});

// token刷新接口（可根据需要添加）
// router.post('/refresh', ...);

module.exports = router; // ✅ 正确导出路由实例