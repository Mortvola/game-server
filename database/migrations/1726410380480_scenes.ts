import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scenes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('root_node_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('root_node_id')
    })
  }
}
