import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('scene_id')
      table.integer('root_scene_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const scenes = await trx.from('scenes')
          .whereNotNull('root_tree_id')

        for (const scene of scenes) {
          const root = await trx.from('tree_nodes')
            .where('id', scene.root_node_id)
            .where('tree_id', scene.root_tree_id)
            .firstOrFail()

          await trx.from('tree_nodes')
            .where('tree_id', root.tree_id)
            .update({
              scene_id: scene.id,
            })

          await trx.from('node_modifications')
            .where('tree_id', root.tree_id)
            .update({
              scene_id: scene.id,
            })
        }

        const trees = await trx.from('tree_nodes')
          .select('root_node_id', 'root_tree_id')
          .whereNotNull('root_node_id')
          .whereNotNull('root_tree_id')
          .groupBy('root_node_id', 'root_tree_id')

        for (const tree of trees) {
          console.log(`node id: ${tree.root_node_id}, tree: ${tree.root_tree_id}`)
          const root = await trx.from('tree_nodes')
            .where('id', tree.root_node_id)
            .where('tree_id', tree.root_tree_id)
            .firstOrFail()

          console.log(`object: ${root.scene_object_id}`)
          const object = await trx.from('scene_objects')
            .where('id', root.scene_object_id)
            .first()

          const [scene] = await trx.table('scenes')
            .insert({
              name: object?.name ?? 'Unknown',
              root_node_id: root.id,
            })
            .returning('id')

          await trx.from('tree_nodes')
            .where('tree_id', root.tree_id)
            .update({
              scene_id: scene.id,
            })

          await trx.from('tree_nodes')
            .where('root_node_id', tree.root_node_id)
            .where('root_tree_id', tree.root_tree_id)
            .update({
              root_scene_id: scene.id,
            })

          await trx.from('node_modifications')
            .where('tree_id', root.tree_id)
            .update({
              scene_id: scene.id,
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
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('scene_id', 'root_scene_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        await trx.from('scenes')
          .whereNull('root_tree_id')
          .delete()

        await trx.commit()
      } catch (error) {
        console.log(error)
        await trx.rollback()
      }
    })
  }
}
