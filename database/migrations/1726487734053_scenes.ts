import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scenes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('scene')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('scene')
    })
  }
}
