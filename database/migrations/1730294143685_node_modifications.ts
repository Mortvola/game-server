import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique(['modifier_node_id', 'node_id', 'path_id'])
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.unique([])
    })
  }
}
