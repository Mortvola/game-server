import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'game_object'

  public async up () {
    this.schema.renameTable('game_objects', 'scene_objects')
  }

  public async down () {
    this.schema.renameTable('scene_objects', 'game_objects')
  }
}
