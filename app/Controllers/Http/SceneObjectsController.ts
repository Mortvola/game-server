import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import NodeModification from 'App/Models/NodeModification'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import { getUniqueId } from 'App/Models/TreeUtils'

export default class SceneObjectsController {
  public async uploadSceneObject ({ request, params }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const object = new SceneObject().useTransaction(trx)

      const payload = request.body()

      object.fill({
        name: payload.name,
        // object: {
        //   type: 'object',
        //   components: payload.component
        //     ? [{ id: 0, type: payload.component.type, props: payload.component.props }]
        //     : [],
        //   transformProps: {
        //     translate: [0, 0, 0],
        //     rotate: [0, 0, 0],
        //     scale: [1, 1, 1],
        //   },
        // },
      })

      const node = new TreeNode()
        .useTransaction(trx)
        .fill({
          id: await getUniqueId(payload.modifierNodeId ?? payload.parentNodeId),
          treeId: params.treeId,
          parentNodeId: payload.parentNodeId,
        })

      await node.save()

      if (
        payload.modifierNodeId !== null
        && payload.pathId !== null
      ) {
        if (payload.parentNodeId !== null) {
          throw new Error('Ambiguous parent information')
        }

        let modification = await NodeModification.query({ client: trx })
          .where('modifierNodeId', payload.modifierNodeId)
          .where('treeId', params.treeId)
          .where('pathId', payload.pathId)
          .first()

        if (modification) {
          modification.merge({
            addedNodes: [
              ...new Set([
                ...modification.addedNodes,
                node.id,
              ]),
            ],
          })
        } else {
          modification = new NodeModification()
            .useTransaction(trx)
            .fill({
              modifierNodeId: payload.modifierNodeId,
              treeId: params.treeId,
              pathId: payload.pathId,
              addedNodes: [node.id],
            })
        }

        await modification.save()
      }

      object.nodeId = node.id
      object.treeId = params.treeId

      await object.save()

      await trx.commit()

      return object
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async getSceneObject ({ params }: HttpContextContract) {
    const object = await SceneObject.findOrFail(params.id)

    // const oldObject = object.object as {
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

    //   object.object = newObject
    // } else if (oldObject.x !== undefined && oldObject.y !== undefined) {
    //   object.object = { ...oldObject }
    // } else if (oldObject.items === undefined) {
    //   object.object = { items: [] }
    // }

    return object
  }

  public async updateSceneObject ({ request, params }: HttpContextContract) {
    const payload = request.body()

    if (payload) {
      let object = await SceneObject.findBy('nodeId', params.nodeId)

      if (object) {
        object.merge({
          name: payload.name,
          components: payload.components,
        })
      } else {
        object = new SceneObject()

        object.fill({
          nodeId: params.nodeId,
          name: payload.name,
          components: payload.components,
        })
      }

      await object.save()
    }
  }

  public async deleteSceneObject ({ params }: HttpContextContract) {
    const object = await SceneObject.query()
      .where('nodeId', params.nodeId)
      .first()

    if (object) {
      await object.delete()
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
