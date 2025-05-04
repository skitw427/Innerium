'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('EmotionTypes', {
      emotion_type_id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      emoji_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      color_hex: {
        type: Sequelize.STRING(7),
        allowNull: true
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('EmotionTypes');
  }
};