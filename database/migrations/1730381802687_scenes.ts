import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'scenes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('root_tree_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const scenes = await trx.from('scenes').whereNotNull('root_node_id')

        for (const scene of scenes) {
          const node = await trx.from('tree_nodes').where('id', scene.root_node_id).first()

          if (node) {
            await trx.from('scenes')
              .where('id', scene.id)
              .update({
                root_tree_id: node.tree_id,
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
      table.dropColumn('root_tree_id')
    })
  }
}
