import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'folders'

  public async up () {
    this.schema.dropTable('folders')
  }

  public async down () {
  }
}
