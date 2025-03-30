const express = require('express');
const router = express.Router();
const { Ingredient, Recipe } = require('../models');

// 获取某个菜谱的所有配料
router.get('/:recipeId', async (req, res) => {
  try {
    const ingredients = await Ingredient.findAll({
      where: { recipe_id: req.params.recipeId },
      include: {
        model: Recipe,
        attributes: ['dish_name']
      }
    });
    res.json(ingredients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建配料
router.post('/', async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新配料
router.put('/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: '配料不存在' });
    }
    
    await ingredient.update(req.body);
    res.json(ingredient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除配料
router.delete('/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findByPk(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ error: '配料不存在' });
    }
    
    await ingredient.destroy();
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; // ✅ 正确导出