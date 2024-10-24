import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import GameObject from 'App/Models/GameObject'
import TreeNode from 'App/Models/TreeNode'

export default class GameObjectsController {
  public async uploadGameObject ({ request }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const object = new GameObject().useTransaction(trx)

      const payload = request.body()

      object.fill({
        object: {
          type: 'object',
          components: payload.component
            ? [{ id: 0, type: payload.component.type, props: payload.component.props }]
            : [],
          transformProps: {
            translate: [0, 0, 0],
            rotate: [0, 0, 0],
            scale: [1, 1, 1],
          },
        },
      })

      if (payload.parentNodeId !== undefined) {
        const node = new TreeNode().useTransaction(trx)

        node.fill({
          name: payload.name,
          parentNodeId: payload.parentNodeId,
          parentWrapperId: payload.parentTreeId,
        })

        await node.save()

        object.nodeId = node.id
      }

      await object.save()

      // let parentId = request.qs().parentId

      // if (parentId) {
      //   parentId = parseInt(parentId)

      //   if (isNaN(parentId)) {
      //     parentId = null
      //   }
      // }

      // const folder = new FolderItem().useTransaction(trx)

      // folder.fill({
      //   name: object.name,
      //   itemId: object.id,
      //   parentId,
      //   type: 'object',
      // })

      // await folder.save()

      await trx.commit()

      return object
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async getGameObject ({ params }: HttpContextContract) {
    const object = await GameObject.findOrFail(params.id)

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

  public async updateGameObject ({ request, params }: HttpContextContract) {
    const payload = request.body()

    if (payload) {
      let object = await GameObject.query()
        .where('nodeId', params.nodeId)
        .where((query) => {
          if (payload.modifierNodeId !== undefined) {
            query.where('modifierNodeId', payload.modifierNodeId)
              .where('pathId', payload.pathId)
          } else {
            query.whereNull('modifierNodeId')
          }
        })
        .first()

      if (object) {
        object.merge({
          modifierNodeId: payload.modifierNodeId,
          pathId: payload.pathId,
          object: payload.object,
        })
      } else {
        object = new GameObject()

        object.fill({
          nodeId: params.nodeId,
          modifierNodeId: payload.modifierNodeId,
          pathId: payload.pathId,
          object: payload.object,
        })
      }

      await object.save()
    }
  }

  public async deleteGameObject ({ params }: HttpContextContract) {
    const query = GameObject.query()
      .where('nodeId', params.nodeId)

    if (params.treeId !== undefined) {
      query.andWhere('modifierNodeId', params.treeId)
    } else {
      query.andWhereNull('modifierNodeId')
    }

    const object = await query.firstOrFail()

    if (object) {
      await object.delete()
    }
  }

  public async getGameObjectList ({}: HttpContextContract) {
    const objects = await GameObject.all()

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
