import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export enum ObjectType {
  NodeObject = 'Object',
  TreeNode = 'TreeNode',
  Tree = 'Tree',
  TreeInstance = 'TreeInstance',
  NodeObjectOverride = 'ObjectOverride',
}

export type TreeNodeDescriptor = {
  id: number,
  type: ObjectType,
  nodes: number[] // Can be a TreeNode or a TreeInstance.
  objectId: number,
}

export type TreeDescriptor = {
  id: number,
  name: string,
  type: ObjectType,
  root: number // References a TreeNode
}

export enum ComponentType {
  Drawable = 'Drawable',
  Light = 'Light',
  RangeCircle = 'RangeCircle',
  ParticleSystem = 'ParticleSystem',
  Mesh = 'Mesh',
  Decal = 'Decal',
}

export type ComponentDescriptor = {
  id: number,
  type: ComponentType,
  props?: unknown,
}

export type TransformPropsDescriptor = {
  translate?: number[];
  rotate?: number[];
  scale?: number[];
}

export default class SceneObject extends BaseModel {
  @column({ isPrimary: true, serializeAs: null })
  public id: number

  @column.dateTime({ autoCreate: true, serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column()
  public name: string | null

  @column({
    prepare: (value: number[]) => JSON.stringify(value),
  })
  public components: number[]

  @column({
    prepare: (value: Record<string, unknown>) => JSON.stringify(value),
  })
  public modifications: Record<string, unknown>

  // @column({
  //   prepare: (value: unknown) => JSON.stringify(value),
  // })
  // public object: { type: string, components: ComponentDescriptor[], transformProps?: TransformPropsDescriptor }

  @column()
  public nodeId: number

  @column()
  public modifierNodeId: number | null

  @column()
  public pathId: number | null
}
