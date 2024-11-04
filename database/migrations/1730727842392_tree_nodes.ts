import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_id').notNullable().alter({ alterNullable: true })
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_id').nullable().alter({ alterNullable: true })
    })
  }
}
