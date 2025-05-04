'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmotionType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      EmotionType.hasMany(models.DailyRecord, {
        foreignKey: 'emotion_type_id',
        sourceKey: 'emotion_type_id',
        as: 'dailyRecords'
      });
      
      EmotionType.belongsToMany(models.FlowerType, {
        through: 'EmotionFlowerPool',
        foreignKey: 'emotion_type_id',
        otherKey: 'flower_type_id',
        as: 'flowerTypes'
      });
    }
  }

  EmotionType.init({
    emotion_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    emoji_url: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    color_hex: {
      type: DataTypes.STRING(7),
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'EmotionType',
    tableName: 'EmotionTypes',
    timestamps: false
  });

  return EmotionType;
};