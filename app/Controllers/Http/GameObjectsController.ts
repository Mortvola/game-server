import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
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

      let parentId = request.qs().parentId

      if (parentId) {
        parentId = parseInt(parentId)

        if (isNaN(parentId)) {
          parentId = null
        }
      }

      const folder = new FolderItem().useTransaction(trx)

      folder.fill({
        name: object.name,
        itemId: object.id,
        parentId,
        type: 'object',
      })

      await folder.save()

      trx.commit()

      return folder
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async getGameObject ({ params }: HttpContextContract) {
    return GameObject.findOrFail(params.id)
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

    return objects
  }
}
