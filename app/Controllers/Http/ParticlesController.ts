import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import Particle from 'App/Models/Particle'

export default class ParticlesController {
  public async uploadParticle ({ request }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const object = new Particle().useTransaction(trx)

      const payload = request.body()

      object.fill({
        name: payload.name,
        descriptor: payload.descriptor,
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
        type: 'particle',
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

  public async getParticle ({ params }: HttpContextContract) {
    return Particle.findOrFail(params.id)
  }

  public async updateParticle ({ request, params }: HttpContextContract) {
    const particleSystem = await Particle.findOrFail(params.id)

    const body = request.body()

    particleSystem.merge({
      descriptor: body.descriptor,
    })

    await particleSystem.save()
  }
}
