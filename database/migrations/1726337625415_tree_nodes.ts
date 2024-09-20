import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      table.integer('parent_node_id')
      table.integer('parent_subnode_id')

      table.integer('root_node_id')
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
