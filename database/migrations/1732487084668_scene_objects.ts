import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('components')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('components').notNullable().defaultTo('{}')
    })
  }
}
