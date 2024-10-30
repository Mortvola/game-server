import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('modifier_node_id')
      table.dropColumn('path')
      table.dropColumn('path_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('modifier_node_id')
      table.jsonb('path')
      table.integer('path_id')
    })
  }
}
