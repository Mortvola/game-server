import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'textures'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('flip_y').notNullable().defaultTo(false)
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('flip_y')
    })
  }
}
