'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.belongsTo(models.Garden, {
        foreignKey: 'current_garden_id',
        targetKey: 'garden_id',
        as: 'currentGarden'
      });

       User.hasMany(models.Garden, {
         foreignKey: 'user_id',
         sourceKey: 'user_id',
         as: 'gardens'
       });
       
      User.hasMany(models.DailyRecord, {
         foreignKey: 'user_id',
         sourceKey: 'user_id',
         as: 'dailyRecords'
       });
    }
  }
  User.init({
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    auth_provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'guest'
    },
    provider_user_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
    },
    notification_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    fcm_token: {
      type: DataTypes.STRING(255),
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'user'
    },
    current_garden_id: {
      type: DataTypes.BIGINT,
      references: {
        model: 'Gardens',
        key: 'garden_id'
      },
      onUpdate: 'CASCADE',   // 참조된 키 변경 시 동작
      onDelete: 'SET NULL'   // 참조된 키 삭제 시 동작
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    underscored: true,

    indexes: [
      {
        unique: true,
        fields: ['auth_provider', 'provider_user_id']
      }
    ]
  });
  return User;
};