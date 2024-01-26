import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import GameObject from 'App/Models/GameObject'

export default class GameObjectsController {
  public async uploadGameObject ({ request }: HttpContextContract): Promise<GameObject> {
    try {
      const object = new GameObject()

      const payload = request.body()

      object.fill({
        name: payload.name,
        object: payload.object,
      })

      await object.save()

      return object
    } catch (error) {
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
