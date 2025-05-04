'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EmotionFlowerPool', {
      mapping_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      emotion_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: 'EmotionTypes', key: 'emotion_type_id' },
        onDelete: 'CASCADE'
      },
      flower_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: 'FlowerTypes', key: 'flower_type_id' },
        onDelete: 'CASCADE'
      }
    });

    await queryInterface.addIndex('EmotionFlowerPool', ['emotion_type_id', 'flower_type_id'], { unique: true });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('EmotionFlowerPool', ['emotion_type_id', 'flower_type_id']);
    await queryInterface.dropTable('EmotionFlowerPool');
  }
};