import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_object_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const nodes = await trx.from('tree_nodes').whereNull('root_node_id')

        for (const node of nodes) {
          const object = await trx.from('scene_objects')
            .where('node_id', node.id)
            .where('tree_id', node.tree_id)
            .first()

          if (object) {
            await trx.from('tree_nodes')
              .where('id', node.id)
              .where('tree_id', node.tree_id)
              .update({
                scene_object_id: object.id,
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
      table.dropColumn('scene_object_id')
    })
  }
}
