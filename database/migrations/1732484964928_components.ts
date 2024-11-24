import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'components'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_object_id').notNullable().alter({ alterNullable: true})
      table.jsonb('props').notNullable().alter({ alterNullable: true })
      table.unique(['scene_object_id', 'type'])
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['scene_object_id', 'type'])
      table.jsonb('props').nullable().alter({ alterNullable: true })
      table.integer('scene_object_id').nullable().alter({ alterNullable: true})
    })
  }
}
