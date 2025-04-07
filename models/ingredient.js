module.exports = (sequelize, DataTypes) => {
    const Ingredient = sequelize.define('Ingredient', {
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false, // 强制要求非空
        defaultValue: '其他',
      },
      amount: DataTypes.STRING,
      tip: DataTypes.STRING
    }, {
      tableName: 'Ingredients',
      timestamps: false
    });
  
    Ingredient.associate = models => {
      Ingredient.belongsTo(models.Recipe, {
        foreignKey: 'recipe_id',
        as: 'recipe'
      });
    };
  
    return Ingredient;
  };