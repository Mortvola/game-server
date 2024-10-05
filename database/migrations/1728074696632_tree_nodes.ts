import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('name')
    })

    this.defer(async () => {
      const trx = await this.db.transaction()

      try {
        const nodes = await trx.from('tree_nodes')

        await Promise.all(nodes.map(async (node) => {
          const object = await trx.from('game_objects')
            .where('node_id', node.id)
            .andWhereNull('tree_id')
            .first()

          if (object) {
            await trx.from('tree_nodes')
              .where('id', node.id)
              .update('name', object.name)

            // Also update tree nodes that have the
            // current node as its root.
            await trx.from('tree_nodes')
              .where('root_node_id', node.id)
              .update('name', object.name)
          }
        }))

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
