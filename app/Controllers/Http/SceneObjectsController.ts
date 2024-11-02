import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Component from 'App/Models/Component'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import { getTreeDescriptor, getUniqueId, ParentDescriptor, setParent } from 'App/Models/TreeUtils'

export default class SceneObjectsController {
  public async uploadSceneObject ({ request, params }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const object = new SceneObject().useTransaction(trx)

      const payload = request.body()

      const transform = new Component().useTransaction(trx)
        .fill({
          type: 'Transform',
          props: {
            translate: [0, 0, 0],
            rotate: [0, 0, 0],
            scale: [1, 1, 1],
          },
        })

      await transform.save()

      const components: number[] = [transform.id]

      if (payload.component) {
        const component = new Component().useTransaction(trx)
          .fill({
            type: payload.component.type,
            props: payload.component.props,
          })

        await component.save()

        components.push(component.id)
      }

      object.fill({
        name: payload.name,
        components,
      })

      await object.save()

      const node = new TreeNode()
        .useTransaction(trx)
        .fill({
          id: await getUniqueId(payload.modifierNodeId ?? payload.parentNodeId),
          sceneId: params.sceneId,
          sceneObjectId: object.id,
        })

      await setParent(node, payload as ParentDescriptor, trx)

      await node.save()

      const response = await getTreeDescriptor(node.id, node.sceneId, trx)

      await trx.commit()

      return response
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async updateSceneObject ({ request, params }: HttpContextContract) {
    const payload = request.body()

    if (payload) {
      let object = await SceneObject.findOrFail(params.id)

      object.merge({
        name: payload.name,
        components: payload.components,
      })

      await object.save()
    }
  }

  public async getSceneObjectList ({}: HttpContextContract) {
    const objects = await SceneObject.all()

    for (let i = 0; i < objects.length; i += 1) {
      // const oldObject = objects[i].object as {
      //   modelId: number,
      //   materials: unknown,
      //   items?: unknown[],
      //   x?: number,
      //   y?: number,
      //   width?: number,
      //   height?: number,
      // }

      // if (oldObject.modelId !== undefined) {
      //   const newObject: {
      //     items: unknown[],
      //   } = {
      //     items: [],
      //   }

      //   newObject.items.push({ item: { id: oldObject.modelId, materials: oldObject.materials }, type: 'model' })

      //   objects[i].object = newObject
      // } else if (oldObject.x !== undefined && oldObject.y !== undefined) {
      //   objects[i].object = { ...oldObject }
      // } else if (oldObject.items === undefined) {
      //   objects[i].object = { items: [] }
      // }
    }

    return objects
  }
}
