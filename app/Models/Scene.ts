import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export type SceneData = {
  objects: number,
}

export default class Scene extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @column()
  public name: string

  @column({ prepare: (value: SceneData) => JSON.stringify(value)})
  public scene: SceneData
}
