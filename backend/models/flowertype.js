'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FlowerType extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      FlowerType.hasMany(models.DailyRecord, {
        foreignKey: 'chosen_flower_type_id',
        sourceKey: 'flower_type_id',
        as: 'dailyRecords'
      });
      
      FlowerType.belongsToMany(models.EmotionType, {
        through: 'EmotionFlowerPool',
        foreignKey: 'flower_type_id',
        otherKey: 'emotion_type_id',
        as: 'emotionTypes'
      });
    }
  }

  FlowerType.init({
    flower_type_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    image_url: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'FlowerType',
    tableName: 'FlowerTypes',
    timestamps: false
  });

  return FlowerType;
};