import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Scene from 'App/Models/Scene'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'

export default class ScenesController {
  public async uploadScene ({ request }: HttpContextContract) {
    const requestData = await request.validate({
      schema: schema.create({
        name: schema.string([rules.trim()]),
        scene: schema.object().anyMembers(),
      }),
    })

    const trx = await Database.transaction()

    try {
      const scene = await new Scene().useTransaction(trx)
        .fill({
          name: requestData.name,
          scene: requestData.scene,
        })
        .save()

      let parentId = request.qs().parentId

      if (parentId) {
        parentId = parseInt(parentId)

        if (isNaN(parentId)) {
          parentId = null
        }
      }

      const folder = new FolderItem().useTransaction(trx)

      folder.fill({
        name: scene.name,
        itemId: scene.id,
        parentId,
        type: 'scene',
      })

      await folder.save()

      await trx.commit()

      return folder
    } catch(error) {
      await trx.rollback()
    }
  }

  public async getScene ({ params }: HttpContextContract) {
    return Scene.findOrFail(params.id)
  }

  public async updateScene ({ request, params }: HttpContextContract) {
    const particleSystem = await Scene.findOrFail(params.id)

    const requestData = await request.validate({
      schema: schema.create({
        name: schema.string([rules.trim()]),
        scene: schema.object().anyMembers(),
      }),
    })

    particleSystem.merge({
      name: requestData.name,
      scene: requestData.scene,
    })

    await particleSystem.save()
  }
}
