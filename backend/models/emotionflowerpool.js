'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class EmotionFlowerPool extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      EmotionFlowerPool.belongsTo(models.EmotionType, { foreignKey: 'emotion_type_id' });
      EmotionFlowerPool.belongsTo(models.FlowerType, { foreignKey: 'flower_type_id' });
   }
 }

 EmotionFlowerPool.init({
   mapping_id: { // PK
     type: DataTypes.BIGINT,
     primaryKey: true,
     autoIncrement: true,
     allowNull: false
   },
   emotion_type_id: {
     type: DataTypes.INTEGER,
     allowNull: false,
     references: { model: 'EmotionTypes', key: 'emotion_type_id' }
   },
   flower_type_id: {
     type: DataTypes.INTEGER,
     allowNull: false,
     references: { model: 'FlowerTypes', key: 'flower_type_id' }
   }
 }, {
   sequelize,
   modelName: 'EmotionFlowerPool',
   tableName: 'EmotionFlowerPool',
   timestamps: false,
   indexes: [
     {
       unique: true,
       fields: ['emotion_type_id', 'flower_type_id']
     },
   ]
 });

 return EmotionFlowerPool;
};