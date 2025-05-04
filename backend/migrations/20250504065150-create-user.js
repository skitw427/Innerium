'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      user_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      auth_provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'guest'
      },
      provider_user_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
      },
      notification_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      fcm_token: {
        type: Sequelize.STRING(255),
      },
      role: {
        type: Sequelize.STRING,
        defaultValue: 'user'
      },
      current_garden_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        // references: {
        //   model: 'Gardens',
        //   key: 'garden_id'
        // },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex(
      'Users',
      ['auth_provider', 'provider_user_id'],
      {
        unique: true,
        name: 'users_auth_provider_provider_user_id_key'
      }
    )
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Users', 'users_auth_provider_provider_user_id_key');
    await queryInterface.dropTable('Users');
  }
};