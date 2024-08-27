import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'folder_items'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('type').notNullable().alter({ alterNullable: false, alterType: true })
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
    })
  }
}
