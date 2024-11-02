import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('tree_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id')
    })
  }
}
