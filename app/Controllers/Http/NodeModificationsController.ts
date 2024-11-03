import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import NodeModification from 'App/Models/NodeModification'
import { schema } from '@ioc:Adonis/Core/Validator'

export default class NodeModificationsController {
  public async update ({ request }: HttpContextContract) {
    const payload = await request.validate({
      schema: schema.create({
        sceneId: schema.number(),
        modifierNodeId: schema.number(),
        pathId: schema.number(),
        modifications: schema.object().anyMembers(),
      }),
    })

    if (payload) {
      let mods = await NodeModification.query()
        .where('nodeId', payload.modifierNodeId)
        .where('sceneId', payload.sceneId)
        .where('pathId', payload.pathId)
        .first()

      if (mods) {
        mods.merge({
          sceneObject: payload.modifications,
        })
      } else {
        mods = new NodeModification()

        mods.fill({
          nodeId: payload.modifierNodeId,
          sceneId: payload.sceneId,
          pathId: payload.pathId,
          sceneObject: payload.modifications,
        })
      }

      await mods.save()
    }
  }
}
