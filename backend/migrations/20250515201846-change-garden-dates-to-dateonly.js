'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.changeColumn('Gardens', 'started_at', {
      type: Sequelize.DATEONLY, // 여기서 DATEONLY로 명시
      allowNull: false
    });
    try {
      await queryInterface.sequelize.query('ALTER TABLE "Gardens" ALTER COLUMN "started_at" DROP DEFAULT;');
      console.log('Successfully dropped existing default for started_at.');
    } catch (e) {
      if (e.original && (e.original.code === '42704' || e.message.includes('does not exist'))) {
        console.log('Default for started_at did not exist or was already dropped.');
      } else {
        console.error('Error dropping default for started_at:', e);
        throw e;
      }
    }

    await queryInterface.sequelize.query('ALTER TABLE "Gardens" ALTER COLUMN "started_at" SET DEFAULT CURRENT_DATE;'); // 괄호 없는 CURRENT_DATE 사용

    await queryInterface.changeColumn('Gardens', 'completed_at', {
      type: Sequelize.DATEONLY, 
      allowNull: true 
    });
  },

  async down (queryInterface, Sequelize) {
    try {
      await queryInterface.sequelize.query('ALTER TABLE "Gardens" ALTER COLUMN "started_at" DROP DEFAULT;');
    } catch (e) {
      if (e.original && (e.original.code === '42704' || e.message.includes('does not exist'))) {
        console.log('Default for started_at (during rollback) did not exist or was already dropped.');
      } else {
        console.error('Error dropping default for started_at during rollback:', e);
        throw e;
      }
    }

    await queryInterface.changeColumn('Gardens', 'started_at', {
      type: Sequelize.DATE,
      allowNull: false
    });
    await queryInterface.sequelize.query('ALTER TABLE "Gardens" ALTER COLUMN "started_at" SET DEFAULT NOW();');
 
    await queryInterface.changeColumn('Gardens', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }
};