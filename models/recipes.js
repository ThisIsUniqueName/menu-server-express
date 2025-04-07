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
    }, images: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      get() {
        const rawValue = this.getDataValue('images');
        // 确保返回标准化的数据结构
        return rawValue.map(img => ({
          original: img.original || '',
          thumbnail: img.thumbnail || '',
          medium: img.medium || ''
        }));
      }
    },
    author_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'Users', // 指向 User 表
          key: 'id'
        }
      },
      is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        set(value) {
          // 处理数字类型输入
          if ([0, 1].includes(Number(value))) {
            this.setDataValue('is_public', Boolean(Number(value)));
          } 
          // 处理字符串类型输入
          else if (typeof value === 'string') {
            this.setDataValue('is_public', value.toLowerCase() === 'true');
          } 
          // 处理布尔值
          else {
            this.setDataValue('is_public', !!value);
          }
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