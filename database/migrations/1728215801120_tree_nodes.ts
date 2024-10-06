import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('parent_tree_id')
    })

    this.defer(async () => {
      const trx = await this.db.transaction()

      try {
        const nodes = await trx.from('tree_nodes')
          .whereNotNull('parent_subnode_id')

        await Promise.all(nodes.map((node) => (
          trx.from('tree_nodes')
            .where('id', node.id)
            .update('parent_tree_id', node.parent_node_id)
            .update('parent_node_id', node.parent_subnode_id)
        )))

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
