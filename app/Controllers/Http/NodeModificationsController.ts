import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import NodeModification from 'App/Models/NodeModification'
import { schema } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'

export default class NodeModificationsController {
  public async update ({ request }: HttpContextContract) {
    const payload = await request.validate({
      schema: schema.create({
        sceneId: schema.number(),
        modifierNodeId: schema.number(),
        pathId: schema.number(),
        modifications: schema.object.optional().anyMembers(),
        source: schema.object.optional().members({
          sceneId: schema.number(),
          modifierNodeId: schema.number(),
          pathId: schema.number(),
          key: schema.string(),
        }),
      }),
    })

    const trx = await Database.transaction()

    try {
      if (payload) {
        let mods = await NodeModification.query({ client: trx })
          .where('nodeId', payload.modifierNodeId)
          .where('sceneId', payload.sceneId)
          .where('pathId', payload.pathId)
          .first()

        if (!mods) {
          mods = new NodeModification()

          mods.fill({
            nodeId: payload.modifierNodeId,
            sceneId: payload.sceneId,
            pathId: payload.pathId,
            sceneObject: {},
          })
        }

        if (payload.modifications) {
          mods.sceneObject = payload.modifications
        } else if (payload.source) {
          const sourceMod = await NodeModification.query({ client: trx })
            .where('nodeId', payload.source.modifierNodeId)
            .where('sceneId', payload.source.sceneId)
            .where('pathId', payload.source.pathId)
            .firstOrFail()

          mods.sceneObject = {
            ...mods.sceneObject,
            [payload.source.key]: sourceMod.sceneObject[payload.source.key],
          }

          delete sourceMod.sceneObject[payload.source.key]

          await sourceMod.save()
        }

        await mods.save()
      }

      await trx.commit()
    } catch (error) {
      console.log(error)
      await trx.rollback()
      throw error
    }
  }
}
