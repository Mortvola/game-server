import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id').notNullable().alter()
      table.integer('path_id2').notNullable().alter()
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id').nullable().alter()
      table.integer('path_id2').nullable().alter()
    })
  }
}
