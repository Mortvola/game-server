import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class NodeModification extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  public id: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column({ serializeAs: null })
  public modifierNodeId: number | null

  @column()
  public nodeId: number

  @column()
  public pathId: number | null

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value),
  })
  public modifications: Record<string, unknown>

  @column({
    prepare: (value: number[]) => JSON.stringify(value),
  })
  public addedNodes: number[]
}
