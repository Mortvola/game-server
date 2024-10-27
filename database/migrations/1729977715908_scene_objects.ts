import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('components').defaultTo('[]').notNullable()
      table.jsonb('modifications').defaultTo('[]').notNullable()
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const objects = await trx.from('scene_objects')

        for (const object of objects) {
          if (object.modifier_node_id !== null) {
            const modifications: Record<string, unknown> = {}

            if (object.name !== null) {
              modifications.name = object.name
            }

            if (object.object?.transformProps !== undefined) {
              modifications['Transform'] = object.object.transformProps
            }

            if (object.object?.components !== undefined && object.object?.components.length > 0) {
              for (const c of object.object.components) {
                modifications[c.type] = c.props
              }
            }

            await trx.from('scene_objects')
              .where('id', object.id)
              .update({
                modifications: JSON.stringify(modifications),
              })
          } else {
            const comps: number[] = []

            if (object.object?.transformProps !== undefined) {
              const comp = await trx.table('components')
                .insert({
                  type: 'Transform',
                  props: JSON.stringify(object.object?.transformProps),
                })
                .returning('id')

              comps.push(comp[0].id)
            }

            if (object.object?.components !== undefined && object.object?.components.length > 0) {
              for (const c of object.object?.components) {
                const comp = await trx.table('components')
                  .insert({
                    // comp_id: c.id,
                    type: c.type,
                    props: JSON.stringify(c.props),
                  })
                  .returning('id')

                comps.push(comp[0].id)
              }
            }

            await trx.from('scene_objects')
              .where('id', object.id)
              .update({
                components: JSON.stringify(comps),
              })
          }
        }

        await trx.commit()
      } catch (error) {
        console.log(error)
        await trx.rollback()
      }
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('components', 'modifications')
    })
  }
}
