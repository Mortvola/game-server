import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import GameObject from 'App/Models/GameObject'

export default class GameObjectsController {
  public async uploadGameObject ({ request }: HttpContextContract): Promise<void> {
    try {
      const object = new GameObject()

      const payload = request.body()

      object.fill({
        name: payload.name,
        object: payload.object,
      })

      await object.save()
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async getGameObject ({ params }: HttpContextContract) {
    return GameObject.findOrFail(params.id)
  }

  public async deleteGameObject ({ params }: HttpContextContract) {
    const object = await GameObject.find(params.id)

    if (object) {
      await object.delete()
    }
  }

  public async getGameObjectList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const objects = await GameObject.all()

    return objects.map((t) => ({ id: t.id, name: t.name }))
  }
}
