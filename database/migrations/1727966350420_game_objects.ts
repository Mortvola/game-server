import BaseSchema from '@ioc:Adonis/Lucid/Schema'
import GameObject from 'App/Models/GameObject'

export default class extends BaseSchema {
  protected tableName = 'game_objects'

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('tree_id')
    })

    this.defer(async () => {
      const trx = await this.db.transaction()

      try {
        const objects = await trx.from('game_objects')
          .whereNotNull('subnode_id')

        await Promise.all(objects.map((object) => (
          trx.from('game_objects')
            .where('id', object.id)
            .update('tree_id', object.node_id)
            .update('node_id', object.subnode_id)
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
