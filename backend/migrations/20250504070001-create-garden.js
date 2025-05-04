'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Gardens', {
      garden_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        // references: {
        //   model: 'Users',
        //   key: 'user_id',
        // },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      tree_level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      emotion_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      started_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      completed_at: {
        allowNull: true,
        type: Sequelize.DATE
      },
      snapshot_image_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      statistic: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('Gardens', ['user_id']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Gardens');
    // await queryInterface.removeIndex('Gardens', ['user_id']);
  }
};