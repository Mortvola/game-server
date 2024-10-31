import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id').nullable().alter({ alterNullable: true })
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('node_id').notNullable().alter({ alterNullable: true })
    })
  }
}
