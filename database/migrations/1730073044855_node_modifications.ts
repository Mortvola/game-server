import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })

      table.integer('modifier_node_id').notNullable()
      table.integer('node_id').notNullable()
      table.integer('path_id').notNullable()

      table.jsonb('modifications').defaultTo('[]').notNullable()
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const objects = await trx.from('scene_objects')
          .whereNotNull('modifier_node_id')

        for (const object of objects) {
          await trx.table('node_modifications')
            .insert({
              modifier_node_id: object.modifier_node_id,
              node_id: object.node_id,
              path_id: object.path_id,
              modifications: object.modifications,
            })
        }

        await trx.commit()
      } catch (error) {
        console.log(error)
        await trx.rollback()
      }
    })
  }

  public async down () {
    this.schema.dropTable(this.tableName)
  }
}
