'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class DailyRecord extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      DailyRecord.belongsTo(models.User, {
        foreignKey: 'user_id',
        targetKey: 'user_id',
        as: 'user'
      });
      DailyRecord.belongsTo(models.Garden, {
        foreignKey: 'garden_id',
        targetKey: 'garden_id',
        as: 'garden'
      });
      DailyRecord.belongsTo(models.EmotionType, {
        foreignKey: 'emotion_type_id',
        targetKey: 'emotion_type_id',
        as: 'emotionType'
      });
      DailyRecord.belongsTo(models.FlowerType, {
        foreignKey: 'chosen_flower_type_id',
        targetKey: 'flower_type_id',
        as: 'chosenFlowerType'
      });
    }
  }

  DailyRecord.init({
    record_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'Users', key: 'user_id' }
    },
    garden_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: 'Gardens', key: 'garden_id' }
    },
    record_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    emotion_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'EmotionTypes', key: 'emotion_type_id' }
    },
    chosen_flower_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'FlowerTypes', key: 'flower_type_id' }
    },
    flower_pos_x: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    flower_pos_y: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    questions_answers: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    result_summary: {
      type: DataTypes.TEXT,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'DailyRecord',
    tableName: 'DailyRecords',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['garden_id', 'record_date']
      },
      { fields: ['user_id'] },
      { fields: ['garden_id'] },
      { fields: ['record_date'] }
    ]
  });

  return DailyRecord;
};