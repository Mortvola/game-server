import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').notNullable().alter()
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name').nullable().alter()
    })
  }
}
