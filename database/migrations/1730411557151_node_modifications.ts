import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('path_id', 'node_id')
      table.renameColumn('path_id2', 'path_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
    })
  }
}
