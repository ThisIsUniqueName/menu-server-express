const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {


  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dish_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    cover: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    summary_time: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      }
    },
    summary_difficulty: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    summary_servings: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    summary_calories: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    steps: {
      type: DataTypes.JSON,
      allowNull: true
    },
    author_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Users', // 指向 User 表
          key: 'id'
        }
      },
    is_public: {
        type: DataTypes.TINYINT(1), // 明确指定类型
        allowNull: false,
        defaultValue: 0, // 设置默认值
        validate: {
          isIn: [[0, 1]] // 限制取值范围
        }
    }
  }, {
    tableName: 'Recipes',
    timestamps: true,
    paranoid: true,
    defaultScope: {
      attributes: {
        exclude: ['deletedAt']
      }
    }
  });

  

  Recipe.associate = (models) => {
    Recipe.belongsTo(models.User, {
      foreignKey: 'author_id',
      as: 'author',
      onDelete: 'SET NULL'
    });

    Recipe.belongsToMany(models.Tag, {
      through: models.RecipeTag,
      foreignKey: 'recipe_id',
      otherKey: 'tag_id',
      as: 'tags'
    });

    Recipe.hasMany(models.Ingredient, {
      foreignKey: 'recipe_id',
      as: 'ingredients'
    });
  };

  return Recipe;
};