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