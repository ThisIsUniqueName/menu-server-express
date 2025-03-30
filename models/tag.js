module.exports = (sequelize, DataTypes) => {
    const Tag = sequelize.define('Tag', {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    }, {
      tableName: 'Tags',
      timestamps: false
    });
  
    Tag.associate = models => {
      Tag.belongsToMany(models.Recipe, {
        through: models.RecipeTag,
        foreignKey: 'tag_id',
        as: 'recipes'
      });
    };
  
    return Tag;
  };