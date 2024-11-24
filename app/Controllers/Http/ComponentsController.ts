import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Component from 'App/Models/Component'

export default class ComponentsController {
  public async update ({ request, params }: HttpContextContract) {
    const component = await Component.query()
      .where('sceneObjectId', params.sceneObjectId)
      .where('type', params.type)
      .firstOrFail()

    const payload = request.body()

    component.merge({
      props: payload,
    })

    await component.save()
  }
}
