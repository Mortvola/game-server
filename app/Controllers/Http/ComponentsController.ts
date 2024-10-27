import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Component from 'App/Models/Component'

export default class ComponentsController {
  public async update ({ request, params }: HttpContextContract) {
    const component = await Component.findOrFail(params.id)

    const payload = request.body()

    component.merge({
      props: payload,
    })

    await component.save()
  }
}
