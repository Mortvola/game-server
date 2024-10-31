import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TreeNode extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public treeId: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column()
  public parentNodeId: number | null

  @column()
  public sceneObjectId: number | null

  @column()
  public rootNodeId: number | null

  @column()
  public rootTreeId: number | null
}
