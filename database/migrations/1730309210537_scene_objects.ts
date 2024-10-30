import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('modifications')
      table.dropColumn('object')
      table.dropColumn('modifier_node_id')
      table.dropColumn('path_id')
      table.integer('node_id').notNullable().alter()
      table.string('name').notNullable().alter()
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('modifications').defaultTo([]).notNullable()
      table.json('object')
      table.integer('modifier_node_id')
      table.integer('path_id')
      table.integer('node_id').nullable().alter()
      table.string('name').nullable().alter()
    })
  }
}
