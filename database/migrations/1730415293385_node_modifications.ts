import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.renameColumn('modifications', 'scene_object')
      // table.jsonb('scene_object').defaultTo({}).notNullable().alter({ alterNullable: false })
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      // table.jsonb('scene_object').defaultTo([]).notNullable().alter({ alterNullable: false })
      table.renameColumn('scene_object', 'modifications')
    })
  }
}
