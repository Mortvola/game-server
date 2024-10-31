import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import NodeModification from 'App/Models/NodeModification'

export default class NodeModificationsController {
  public async update ({ request }: HttpContextContract) {
    const payload = request.body()

    if (payload) {
      let mods = await NodeModification.query()
        .where('modifierNodeId', payload.modifierNodeId)
        .where('treeId', payload.treeId)
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
          treeId: payload.treeId,
          pathId: payload.pathId,
          modifications: payload.modifications,
        })
      }

      await mods.save()
    }
  }
}
