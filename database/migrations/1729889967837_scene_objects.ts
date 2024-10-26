import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scene_objects'

  public debug = true

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()
      trx.debug = true

      try {
        const objects = await trx.from('scene_objects')
          .whereNull('modifier_node_id')

        for (const object of objects) {
          const node = await trx.from('tree_nodes').where('id', object.node_id).first()

          if (node) {
            await trx.from('scene_objects')
              .update('name', node.name)
              .where('id', object.id)
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
      table.dropColumn('name')
    })
  }
}
