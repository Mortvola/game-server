import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'components'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_object_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const components = await trx.from('components')

        for (const component of components) {
          const object = await trx.from('scene_objects')
            .whereRaw(`components @> \'${component.id}'::jsonb`)
            .first()

          if (object) {
            await trx.from('components')
              .where('id', component.id)
              .update({
                scene_object_id: object.id,
              })
          }
        }

        await trx.commit()
      } catch (error) {
        await trx.rollback()
        console.log(error)
      }
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('scene_object_id')
    })
  }
}
