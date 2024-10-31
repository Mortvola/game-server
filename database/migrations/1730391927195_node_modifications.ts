import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id').nullable().alter({ alterNullable: true })
      table.integer('path_id').nullable().alter({ alterNullable: true })
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id').notNullable().alter({ alterNullable: true })
      table.integer('path_id').notNullable().alter({ alterNullable: true })
    })
  }
}
