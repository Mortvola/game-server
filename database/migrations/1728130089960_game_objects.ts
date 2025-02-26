import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'game_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('name')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name')
    })
  }
}
