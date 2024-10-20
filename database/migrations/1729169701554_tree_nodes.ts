import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id')
    })

    this.defer(async () => {
      const trx = await this.db.transaction()

      try {
        const nodes = await trx.from('tree_nodes')

        await Promise.all(nodes.map(async (node) => {
          let root = node

          while (root) {
            if (root.parent_tree_id !== null) {
              root = await trx.from('tree_nodes').where('id', root.parent_tree_id).first()
            } else if (root.parent_node_id !== null) {
              root = await trx.from('tree_nodes').where('id', root.parent_node_id).first()
            } else {
              break
            }
          }

          if (root) {
            return trx.from('tree_nodes')
              .where('id', node.id)
              .update('tree_id', root.id)
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
      table.dropColumn('tree_id')
    })
  }
}
