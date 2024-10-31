import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('node_id', 'tree_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id')
      table.integer('tree_id')
    })
  }
}
