import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('tree_id', 'root_tree_id')
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id')
      table.integer('root_tree_id')
    })
  }
}
