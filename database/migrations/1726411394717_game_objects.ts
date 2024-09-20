import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'game_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id')
      table.integer('subnode_id')
      table.integer('base_object_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('tree_id', 'node_id', 'baseObject_id')
    })
  }
}
