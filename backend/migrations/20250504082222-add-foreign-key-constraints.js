'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('Users', {
      fields: ['current_garden_id'],
      type: 'foreign key',
      name: 'users_current_garden_id_fk',
      references: {
        table: 'Gardens',
        field: 'garden_id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('Gardens', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'gardens_user_id_fk',
      references: {
        table: 'Users',
        field: 'user_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('DailyRecords', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'dailyrecords_user_id_fk',
      references: { table: 'Users', field: 'user_id' },
      onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('DailyRecords', {
      fields: ['garden_id'],
      type: 'foreign key',
      name: 'dailyrecords_garden_id_fk',
      references: { table: 'Gardens', field: 'garden_id' },
      onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('DailyRecords', {
      fields: ['emotion_type_id'],
      type: 'foreign key',
      name: 'dailyrecords_emotion_type_id_fk',
      references: { table: 'EmotionTypes', field: 'emotion_type_id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });
     await queryInterface.addConstraint('DailyRecords', {
      fields: ['chosen_flower_type_id'],
      type: 'foreign key',
      name: 'dailyrecords_chosen_flower_type_id_fk',
      references: { table: 'FlowerTypes', field: 'flower_type_id' },
      onDelete: 'RESTRICT', onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('EmotionFlowerPool', {
       fields: ['emotion_type_id'],
       type: 'foreign key',
       name: 'efp_emotion_type_id_fk',
       references: { table: 'EmotionTypes', field: 'emotion_type_id'},
       onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });
    await queryInterface.addConstraint('EmotionFlowerPool', {
       fields: ['flower_type_id'],
       type: 'foreign key',
       name: 'efp_flower_type_id_fk',
       references: { table: 'FlowerTypes', field: 'flower_type_id'},
       onDelete: 'CASCADE', onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('EmotionFlowerPool', 'efp_flower_type_id_fk');
    await queryInterface.removeConstraint('EmotionFlowerPool', 'efp_emotion_type_id_fk');
    await queryInterface.removeConstraint('DailyRecords', 'dailyrecords_chosen_flower_type_id_fk');
    await queryInterface.removeConstraint('DailyRecords', 'dailyrecords_emotion_type_id_fk');
    await queryInterface.removeConstraint('DailyRecords', 'dailyrecords_garden_id_fk');
    await queryInterface.removeConstraint('DailyRecords', 'dailyrecords_user_id_fk');
    await queryInterface.removeConstraint('Gardens', 'gardens_user_id_fk');
    await queryInterface.removeConstraint('Users', 'users_current_garden_id_fk');
  }
};