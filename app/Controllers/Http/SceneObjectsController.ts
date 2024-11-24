import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Component from 'App/Models/Component'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import { getTreeDescriptor, getUniqueId, setParent } from 'App/Models/TreeUtils'
import { schema } from '@ioc:Adonis/Core/Validator'

export default class SceneObjectsController {
  public async uploadSceneObject ({ request, params }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const sceneId = parseInt(params.sceneId, 10)

      const payload = await request.validate({
        schema: schema.create({
          name: schema.string(),
          component: schema.object.optional().members({
            type: schema.string(),
            props: schema.object().anyMembers(),
          }),
          parentNodeId: schema.number.nullable(),
          modifierNodeId: schema.number.nullable(),
          pathId: schema.number.nullable(),
        }),
      })

      const object = new SceneObject().useTransaction(trx)

      object.fill({
        name: payload.name,
      })

      await object.save()

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

      if (payload.component) {
        const component = new Component().useTransaction(trx)
          .fill({
            sceneObjectId: object.id,
            type: payload.component.type,
            props: payload.component.props,
          })

        await component.save()
      }

      const node = new TreeNode()
        .useTransaction(trx)
        .fill({
          id: getUniqueId(),
          sceneId,
          sceneObjectId: object.id,
        })

      const modification = await setParent(node, payload, trx)

      await node.save()

      const response = await getTreeDescriptor(node.id, node.sceneId, trx)

      if (modification) {
        response.modifications = [modification]
      }

      await trx.commit()

      return response
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async updateSceneObject ({ request, params }: HttpContextContract) {
    const payload = await request.validate({
      schema: schema.create({
        name: schema.string(),
      }),
    })

    const objectId = parseInt(params.id, 10)

    if (payload) {
      let object = await SceneObject.findOrFail(objectId)

      object.merge({
        name: payload.name,
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
