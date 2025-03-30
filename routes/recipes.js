const express = require('express');
const router = express.Router();
const { Recipe, User, Tag, Ingredient } = require('../models');
const { Op } = require('sequelize');
const { singleUpload, multiUpload } = require('../utils/upload');
const authMiddleware = require('../middlewares/auth');
const fs = require('fs');
const path = require('path');

// 获取分页列表（带权限过滤）
// 获取分页列表（带权限过滤）
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, pageSize = 10, keyword } = req.query;
        const offset = (page - 1) * pageSize;
        const currentUserId = req.user.id;

        // 构建基础查询条件
        const baseWhere = {
            [Op.or]: [
                { is_public: true },
                { author_id: currentUserId }
            ]
        };

        // 添加关键词搜索
        if (keyword) {
            baseWhere[Op.and] = {
                [Op.or]: [
                    { dish_name: { [Op.like]: `%${keyword}%` } },
                    { '$tags.name$': { [Op.like]: `%${keyword}%` } }
                ]
            };
        }

        const result = await Recipe.findAndCountAll({
            where: baseWhere,
            include: [
                {
                    model: User,
                    as: 'author',
                    attributes: ['id', 'name', 'avatar'],
                    where: { status: 'active' } // 只显示有效作者
                },
                {
                    model: Tag,
                    as: 'tags',
                    through: { attributes: [] },
                    attributes: ['id', 'name'],
                    required: false // 允许菜谱无标签
                },
                {
                    model: Ingredient,
                    as: 'ingredients',
                    attributes: ['id', 'name', 'amount'],
                    required: false // 允许菜谱无配料
                }
            ],
            distinct: true,
            offset: +offset,
            limit: +pageSize,
            order: [
                ['is_public', 'ASC'],
                ['createdAt', 'DESC']
            ],
            subQuery: false // 优化关联查询性能
        });

        res.json({
            total: result.count,
            data: result.rows.map(recipe => ({
                ...recipe.get({ plain: true }),
                can_edit: recipe.author_id === currentUserId,
                is_public: Boolean(recipe.is_public)
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 创建菜谱接口（正确版本）
router.post('/', authMiddleware, multiUpload, async (req, res) => {
    try {
        const { body, files } = req; // ✅ 正确获取上传文件

        // 处理上传的图片
        const imagePaths = files?.map(file => file.filename) || [];

        const recipeData = {
            ...body,
            author_id: req.user.id,
            images: imagePaths,
            steps: JSON.parse(body.steps),
            is_public: Boolean(Number(body.is_public))
        };

        const transaction = await Recipe.sequelize.transaction();

        try {
            // ✅ 正确创建新菜谱
            const recipe = await Recipe.create(recipeData, { transaction });

            // 处理标签关联
            if (body.tags) {
                const tagIds = JSON.parse(body.tags);
                await recipe.setTags(tagIds, { transaction });
            }

            // 处理配料
            if (body.ingredients) {
                await Ingredient.bulkCreate(
                    JSON.parse(body.ingredients).map(i => ({
                        ...i,
                        recipe_id: recipe.id
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            // ✅ 返回完整的图片URL
            res.status(201).json({
                ...recipe.toJSON(),
                images: imagePaths.map(filename => `/uploads/${filename}`)
            });

        } catch (error) {
            await transaction.rollback();

            // 回滚时删除已上传的图片
            if (files?.length) {
                files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }

            throw error;
        }
    } catch (error) {
        res.status(400).json({
            error: error.message,
            detail: process.env.NODE_ENV === 'development' ? error.stack : null
        });
    }
});

// 更新菜谱（带权限验证）
router.put('/:id', authMiddleware, singleUpload, async (req, res) => {
    let transaction;
    let updateData;
    try {
        const recipe = await Recipe.findOne({
            where: { id: req.params.id, author_id: req.user.id }
        });

        if (!recipe) {
            return res.status(404).json({ error: '菜谱不存在或无权修改' });
        }

        // 参数校验
        const { body } = req;
        if (!body.steps) {
            return res.status(400).json({ error: '步骤信息缺失' });
        }

        // 安全解析 JSON
        let steps;
        try {
            steps = JSON.parse(body.steps);
        } catch (e) {
            return res.status(400).json({ error: '步骤格式错误' });
        }

        // 构造更新数据
        updateData = {
            ...body,
            steps: steps,
            is_public: body.is_public ? 1 : 0
        };

        transaction = await Recipe.sequelize.transaction();
        // 更新逻辑...
        await recipe.update(updateData, { transaction });

        // 提交事务
        await transaction.commit();

        // ✅ 事务外查询最新数据
        const updatedRecipe = await Recipe.findByPk(recipe.id, {
            include: [
                { model: User, as: 'author' },
                { model: Tag, as: 'tags' },
                { model: Ingredient, as: 'ingredients' }
            ]
        });

        res.json(updatedRecipe);

    } catch (error) {
        await transaction.rollback();

        // 清理上传的文件
        if (req.file) fs.unlinkSync(req.file.path);

        // ✅ 直接在此处发送错误响应
        res.status(500).json({
            error: '更新失败',
            detail: process.env.NODE_ENV === 'development' ? error.message : null
        });
    }
}
);

// 删除菜谱
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const recipe = await Recipe.findOne({
            where: { id: req.params.id, author_id: req.user.id }
        });

        if (!recipe) {
            return res.status(404).json({ error: '菜谱不存在或无权删除' });
        }

        const transaction = await Recipe.sequelize.transaction();

        try {
            // 删除关联数据
            await Ingredient.destroy({
                where: { recipe_id: recipe.id },
                transaction
            });

            await RecipeTag.destroy({
                where: { recipe_id: recipe.id },
                transaction
            });

            // 删除主记录
            await recipe.destroy({ transaction });

            // 删除封面文件
            if (recipe.cover) {
                const filePath = path.join(__dirname, '../public', recipe.cover);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }

            await transaction.commit();
            res.json({ message: '删除成功' });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;