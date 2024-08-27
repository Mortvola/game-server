import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

export default class FolderItem extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column()
  public type: string

  @column()
  public name: string

  @column()
  public itemId: number | null

  @column()
  public parentId: number | null

  public static async addFolderItem (
    name: string,
    itemId: number,
    type: string,
    parentId: number | null,
    trx: TransactionClientContract,
  ) {
    const item = new FolderItem().useTransaction(trx)

    item.fill({
      name,
      itemId,
      parentId,
      type,
    })

    await item.save()

    return item
  }
}
