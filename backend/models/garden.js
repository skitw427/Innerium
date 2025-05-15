'use strict';
const {
  Model,
  Sequelize
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Garden extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Garden.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'user_id',
        as: 'user'
      });
      
      Garden.hasMany(models.DailyRecord, {
        foreignKey: 'garden_id',
        sourceKey: 'garden_id',
        as: 'dailyRecords'
      });
      
      Garden.hasOne(models.User, {
        foreignKey: 'current_garden_id',
        sourceKey: 'garden_id',
        as: 'currentUser'
      });
    }
  }
  Garden.init({
    garden_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'user_id',
      },
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    tree_level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    emotion_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    started_at: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.fn('CURRENT_DATE')
    },
    completed_at: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    snapshot_image_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    statistic: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'Garden',
    tableName: 'Gardens',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'] 
      }
    ]
  });
  return Garden;
};