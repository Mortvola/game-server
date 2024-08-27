import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import GameObject from 'App/Models/GameObject'

export default class GameObjectsController {
  public async uploadGameObject ({ request }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const object = new GameObject().useTransaction(trx)

      const payload = request.body()

      object.fill({
        name: payload.name,
        object: payload.object,
      })

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
    const object = await GameObject.findOrFail(params.id)

    object.merge(
      request.body(),
    )

    await object.save()
  }

  public async deleteGameObject ({ params }: HttpContextContract) {
    const object = await GameObject.find(params.id)

    if (object) {
      await object.delete()
    }
  }

  public async getGameObjectList ({}: HttpContextContract) {
    const objects = await GameObject.all()

    for (let i = 0; i < objects.length; i += 1) {
      const oldObject = objects[i].object as {
        modelId: number,
        materials: unknown,
        items?: unknown[],
        x?: number,
        y?: number,
        width?: number,
        height?: number,
      }

      if (oldObject.modelId !== undefined) {
        const newObject: {
          items: unknown[],
        } = {
          items: [],
        }

        newObject.items.push({ item: { id: oldObject.modelId, materials: oldObject.materials }, type: 'model' })

        objects[i].object = newObject
      } else if (oldObject.x !== undefined && oldObject.y !== undefined) {
        objects[i].object = { ...oldObject }
      } else if (oldObject.items === undefined) {
        objects[i].object = { items: [] }
      }
    }
    return objects
  }
}
