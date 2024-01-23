import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Model from 'App/Models/Model'

export default class ModelsController {
  public async uploadModel ({ request }: HttpContextContract): Promise<void> {
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
      }
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async getModelList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const models = await Model.all()

    return models.map((m) => ({ id: m.id, name: m.name }))
  }
}
