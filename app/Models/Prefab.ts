import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export type PrefabNodeData = {
  id: number,
  name: string,
  components: unknown[],
  nodes: PrefabNodeData[],
}

export type PrefabData = {
  id: number,
  name: string,
  root: PrefabNodeData,
}

export default class Prefab extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public name: string

  @column({
    prepare: (value: PrefabData) => JSON.stringify(value),
  })
  public prefab: PrefabData
}
