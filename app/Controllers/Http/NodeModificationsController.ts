import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import NodeModification from 'App/Models/NodeModification'

export default class NodeModificationsController {
  public async update ({ request }: HttpContextContract) {
    const payload = request.body()

    if (payload) {
      let mods = await NodeModification.query()
        .where('modifierNodeId', payload.modifierNodeId)
        // .where('nodeId', payload.nodeId)
        .where('pathId', payload.pathId)
        .first()

      if (mods) {
        mods.merge({
          modifications: payload.modifications,
        })
      } else {
        mods = new NodeModification()

        mods.fill({
          modifierNodeId: payload.modifierNodeId,
          // nodeId: payload.nodeId,
          pathId: payload.pathId,
          modifications: payload.modifications,
        })
      }

      await mods.save()
    }
  }
}
