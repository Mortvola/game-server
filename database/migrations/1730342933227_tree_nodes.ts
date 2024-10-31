import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('root_tree_id')
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const nodes = await trx.from('tree_nodes').whereNotNull('root_node_id')

        for (const node of nodes) {
          const root = await trx.from('tree_nodes')
            .where('id', node.root_node_id)
            .first()

          if (root) {
            await trx.from('tree_nodes')
              .where('id', node.id)
              .update({
                root_tree_id: root.tree_id,
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
