module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {

      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        allowNull: false
      }
    }, {
      tableName: 'Users',
      timestamps: false
    });
  
    User.associate = function(models) {
        User.hasMany(models.Recipe, {
          foreignKey: 'author_id',  // 与 Recipe 模型中的外键匹配
          as: 'recipes'             // 可选别名
        });
      };
    return User; // 必须返回模型实例
  };