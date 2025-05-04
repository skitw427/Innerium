'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('DailyRecords', {
      record_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        // references: { model: 'Users', key: 'user_id' },
        onDelete: 'CASCADE'
      },
      garden_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        // references: { model: 'Gardens', key: 'garden_id' },
        onDelete: 'CASCADE'
      },
      record_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      emotion_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: 'EmotionTypes', key: 'emotion_type_id' },
        // EmotionType 삭제 시 어떻게 할지? (SET NULL, RESTRICT 등)
        onDelete: 'RESTRICT' // 기본값 또는 명시적 설정
      },
      chosen_flower_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // references: { model: 'FlowerTypes', key: 'flower_type_id' },
        onDelete: 'RESTRICT'
      },
      flower_pos_x: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      flower_pos_y: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      questions_answers: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      result_summary: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('DailyRecords', ['garden_id', 'record_date'], { unique: true });
    await queryInterface.addIndex('DailyRecords', ['user_id']);
    await queryInterface.addIndex('DailyRecords', ['garden_id']);
    await queryInterface.addIndex('DailyRecords', ['record_date']);
  },
  async down(queryInterface, Sequelize) {
    
    await queryInterface.removeIndex('DailyRecords', ['record_date']);
    await queryInterface.removeIndex('DailyRecords', ['garden_id']);
    await queryInterface.removeIndex('DailyRecords', ['user_id']);
    await queryInterface.removeIndex('DailyRecords', ['garden_id', 'record_date']);
    await queryInterface.dropTable('DailyRecords');
  }
};