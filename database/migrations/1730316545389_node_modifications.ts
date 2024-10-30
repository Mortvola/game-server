import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'node_modifications'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('path_id2')
      table.dropUnique(['modifier_node_id', 'node_id', 'path_id'])
      table.unique(['modifier_node_id', 'path_id2'])
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const mods = await trx.from('node_modifications')

        for (const mod of mods) {
          await trx.from('node_modifications')
            .where('id', mod.id)
            .update({
              path_id2: mod.path_id ^ mod.node_id,
            })
        }

        await trx.commit()
      } catch(error) {
        console.log(error)
        await trx.rollback()
      }
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['modifier_node_id', 'path_id2'])
      table.unique(['modifier_node_id', 'node_id', 'path_id'])
      table.dropColumn('path_id2')
    })
  }
}
