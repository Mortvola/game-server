import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'game_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('tree_id', 'modifier_node_id')
      table.integer('path_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('modifier_node_id', 'tree_id')
      table.dropColumn('path_id')
    })
  }
}
