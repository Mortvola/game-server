import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('added_nodes').defaultTo('[]').notNullable()
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const nodes = await trx.from('tree_nodes')
          .whereNotNull('modifier_node_id')
          .whereNotNull('path_id')

        for (const node of nodes) {
          const nodeModification = await trx.from('node_modifications')
            .where('modifier_node_id', node.modifier_node_id)
            .where('path_id', node.path_id)

          if (nodeModification.length > 1) {
            throw new Error(`multiple node modifications found for modifier node ${node.modifier_node_id} and path ${node.path_id} `)
          }

          if (nodeModification.length === 1) {
            await trx.from('node_modifications')
              .where('id', nodeModification[0].id)
              .update({
                added_nodes: JSON.stringify([...nodeModification[0].added_nodes, node.id]),
              })
          } else {
            await trx.table('node_modifications')
              .insert({
                modifier_node_id: node.modifier_node_id,
                node_id: node.parent_node_id,
                path_id: node.path_id,
                modifications: JSON.stringify([]),
                added_nodes: JSON.stringify([node.id]),
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
      table.dropColumn('added_nodes')
    })
  }
}
