module.exports = (sequelize, DataTypes) => {
    const RecipeTag = sequelize.define('RecipeTag', {
      recipe_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      tag_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      }
    }, {
      tableName: 'Recipe_Tags',
      timestamps: false
    });
  
    return RecipeTag;
  };