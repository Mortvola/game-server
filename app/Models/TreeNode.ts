import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class TreeNode extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column()
  public parentNodeId: number | null

  // @column()
  // public modifierNodeId: number | null

  @column()
  public rootNodeId: number | null

  // @column()
  // public pathId: number | null

  // @column({
  //   prepare: (value: number[]) => JSON.stringify(value),
  // })
  // public path: number[] | null
}
