import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'folder_items'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      table.enum('type', ['folder', 'texture', 'shader', 'material', 'model', 'object', 'particle']).notNullable()
      table.integer('item_id').notNullable()
      table.integer('parent_id')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
