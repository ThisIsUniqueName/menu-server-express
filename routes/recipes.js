const express = require('express');
const router = express.Router();
const { Recipe, User, Tag, Ingredient } = require('../models');
const { Op } = require('sequelize');
const { multiUpload } = require('../utils/upload');
const authMiddleware = require('../middlewares/auth');
// 引入MinIO客户端和初始化方法
const { minioClient, initBucket } = require('../utils/minio');
const { v4: uuidv4 } = require('uuid');

// MinIO存储桶初始化（服务启动时执行）
(async () => {
  try {
    await initBucket();
    console.log('✅ MinIO存储桶初始化完成');
  } catch (err) {
    console.error('❌ MinIO存储桶初始化失败:', err);
  }
})();

// 创建菜谱接口
router.post('/', authMiddleware, multiUpload, async (req, res) => {
    let transaction;
    try {
      const { body } = req;
      const { processedFiles } = req; // 从上传中间件获取处理后的文件信息
  
      // 参数校验增强
      if (!body.steps) {
        return res.status(400).json({ error: '必须提供步骤信息' });
      }
  
      // 构建菜谱数据
      const recipeData = {
        ...body,
        author_id: req.user.id,
        images: processedFiles.map(file => ({
          original: file.original,
          thumbnail: file.thumbnail,
          medium: file.medium
        })),
        steps: JSON.parse(body.steps),
        is_public: (() => {
          const value = body.is_public;
          if (typeof value === 'string') {
            return value === 'true' || value === '1';
          }
          return Boolean(value);
        })()
      };
  
      transaction = await Recipe.sequelize.transaction();
  
      try {
        // 创建菜谱主体
        const recipe = await Recipe.create(recipeData, { transaction });
  
        // 处理标签关联（带校验）
        if (body.tags) {
          const tagIds = JSON.parse(body.tags);
          if (Array.isArray(tagIds)) {
            const validTags = await Tag.findAll({
              where: { id: tagIds },
              transaction
            });
            await recipe.setTags(validTags.map(t => t.id), { transaction });
          }
        }
  
        // 处理配料（带默认分类）
        if (body.ingredients) {
          const ingredients = JSON.parse(body.ingredients).map(i => ({
            name: i.name,
            amount: i.amount,
            category: i.category || '其他', // 确保分类字段
            recipe_id: recipe.id
          }));
          
          await Ingredient.bulkCreate(ingredients, { 
            transaction,
            validate: true // 启用模型验证
          });
        }
  
        await transaction.commit();
        
        // 返回完整数据（包含关联）
        const fullRecipe = await Recipe.findByPk(recipe.id, {
          include: [
            { model: Tag, as: 'tags' },
            { model: Ingredient, as: 'ingredients' }
          ]
        });
  
        res.status(201).json(fullRecipe.toJSON());
  
      } catch (error) {
        await transaction.rollback();
        
        // 清理已上传的所有图片版本
        if (processedFiles?.length) {
          await Promise.all(
            processedFiles.flatMap(file => [
              minioClient.removeObject(process.env.MINIO_BUCKET, file.original.split('/').pop()),
              minioClient.removeObject(process.env.MINIO_BUCKET, file.thumbnail.split('/').pop()),
              minioClient.removeObject(process.env.MINIO_BUCKET, file.medium.split('/').pop())
            ])
          );
        }
  
        // 记录详细错误日志
        logger.error('创建菜谱事务失败', {
          error: error.message,
          stack: error.stack,
          body: req.body
        });
  
        // 客户端友好错误提示
        const errorMessage = error.name === 'SequelizeValidationError' 
          ? '数据验证失败，请检查输入格式'
          : error.message;
  
        res.status(400).json({ error: errorMessage });
      }
    } catch (error) {
      console.error('创建菜谱全局错误:', error);
      res.status(500).json({ 
        error: '服务器处理请求时发生意外错误',
        ...(process.env.NODE_ENV === 'development' && { detail: error.stack })
      });
    }
  });

// 更新删除操作需要同步修改（示例：删除菜谱）
router.delete('/:id', authMiddleware, async (req, res) => {
  let transaction;
  try {
    const recipe = await Recipe.findOne({
      where: { id: req.params.id, author_id: req.user.id }
    });

    if (!recipe) {
      return res.status(404).json({ error: '菜谱不存在或无权删除' });
    }

    transaction = await Recipe.sequelize.transaction();

    try {
      // 删除关联数据...（保持原逻辑）

      // 删除MinIO中的图片
      if (recipe.images && recipe.images.length > 0) {
        await Promise.all(
          recipe.images.map(url => {
            const objectName = url.split('/').pop();
            return minioClient.removeObject(process.env.MINIO_BUCKET, objectName);
          })
        );
      }

      await recipe.destroy({ transaction });
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

// 获取分页菜谱列表（带权限控制）
router.get('/', authMiddleware, async (req, res) => {
    try {
      const { page = 1, pageSize = 10, keyword, tagIds } = req.query;
      const offset = (page - 1) * pageSize;
      const currentUserId = req.user.id;
  
      // 构建查询条件
      const where = {
        [Op.or]: [
          { is_public: true },
          { author_id: currentUserId }
        ]
      };
  
      // 关键词搜索
      if (keyword) {
        where[Op.and] = {
          [Op.or]: [
            { dish_name: { [Op.like]: `%${keyword}%` } },
            { '$tags.name$': { [Op.like]: `%${keyword}%` } }
          ]
        };
      }
  
      // 标签过滤
      if (tagIds) {
        where['$tags.id$'] = { [Op.in]: tagIds.split(',').map(Number) };
      }
  
      const result = await Recipe.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'avatar'],
            where: { status: 'active' }
          },
          {
            model: Tag,
            as: 'tags',
            through: { attributes: [] },
            attributes: ['id', 'name']
          },
          {
            model: Ingredient,
            as: 'ingredients',
            attributes: ['id', 'name', 'amount', 'category']
          }
        ],
        distinct: true,
        offset: +offset,
        limit: +pageSize,
        order: [
          ['createdAt', 'DESC'],
          [{ model: Tag, as: 'tags' }, 'name', 'ASC']
        ]
      });
  
      // 转换图片URL为数组格式
      const transformedData = result.rows.map(recipe => {
        const jsonRecipe = recipe.toJSON();
        return {
          ...jsonRecipe,
          canEdit: jsonRecipe.author_id === currentUserId,
          images: jsonRecipe.images.map(img => ({
            original: img.original,
            thumbnail: img.thumbnail || img.original, // 兼容旧数据
            medium: img.medium || img.original
          }))
        };
      });
  
      res.json({
        total: result.count,
        currentPage: +page,
        totalPages: Math.ceil(result.count / pageSize),
        data: transformedData
      });
  
    } catch (error) {
      console.error('获取列表失败:', error);
      res.status(500).json({
        error: '获取菜谱列表失败',
        ...(process.env.NODE_ENV === 'development' && { detail: error.stack })
      });
    }
  });

  // 获取菜谱详情接口（带权限验证）
router.get('/:id', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user.id;
  
      // 参数校验
      if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ error: '无效的菜谱ID' });
      }
  
      // 查询条件（公开或自己的菜谱）
      const recipe = await Recipe.findOne({
        where: {
          id,
          [Op.or]: [
            { is_public: true },
            { author_id: currentUserId }
          ]
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'avatar'],
            where: { status: 'active' }
          },
          {
            model: Tag,
            as: 'tags',
            through: { attributes: [] },
            attributes: ['id', 'name']
          },
          {
            model: Ingredient,
            as: 'ingredients',
            attributes: ['id', 'name', 'amount', 'category']
          }
        ],
        rejectOnEmpty: false // 避免抛出Sequelize EmptyResultError
      });
  
      // 处理查询结果
      if (!recipe) {
        return res.status(404).json({ 
          error: req.user.role === 'admin' 
            ? '菜谱不存在' 
            : '菜谱不存在或无权查看'
        });
      }
  
      // 转换数据结构
      const recipeJson = recipe.toJSON();
      const responseData = {
        ...recipeJson,
        canEdit: recipeJson.author_id === currentUserId,
        images: recipeJson.images.map(img => ({
          original: img.original,
          thumbnail: img.thumbnail || img.original,
          medium: img.medium || img.original
        }))
      };
  
      res.json(responseData);
  
    } catch (error) {
      console.error('获取详情失败:', error);
      res.status(500).json({
        error: '获取菜谱详情失败',
        ...(process.env.NODE_ENV === 'development' && { detail: error.stack })
      });
    }
  });

module.exports = router;