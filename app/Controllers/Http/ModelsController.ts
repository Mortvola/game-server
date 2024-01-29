import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Model from 'App/Models/Model'
import Drive from '@ioc:Adonis/Core/Drive'

export default class ModelsController {
  public async uploadModel ({ request }: HttpContextContract): Promise<{ id: number, name: string }> {
    try {
      const file = request.file('file')

      await file?.moveToDisk('models')

      if (file?.fileName) {
        const model = new Model()

        model.fill({
          name: file?.clientName ?? 'file',
          filename: file?.fileName,
        })

        await model.save()

        return { id: model.id, name: model.name }
      }
    } catch (error) {
      console.log(error)
      throw error
    }

    throw new Error('upload failed')
  }

  public async getModel ({ params, response }: HttpContextContract) {
    const model = await Model.findOrFail(params.id)

    response.stream(await Drive.getStream(`models/${model.filename}`))
  }

  public async updateModel ({ params, request }: HttpContextContract) {
    const model = await Model.findOrFail(params.id)

    model.merge(
      request.body(),
    )

    await model.save()
  }

  public async deleteModel ({ params }: HttpContextContract) {
    const model = await Model.find(params.id)

    if (model) {
      await Drive.delete(`models/${model.filename}`)
      await model.delete()
    }
  }

  public async getModelList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const models = await Model.all()

    return models.map((m) => ({ id: m.id, name: m.name }))
  }
}
