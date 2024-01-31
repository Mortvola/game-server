import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Model from 'App/Models/Model'
import Drive from '@ioc:Adonis/Core/Drive'
import FolderItem from 'App/Models/FolderItem'
import Database from '@ioc:Adonis/Lucid/Database'

export default class ModelsController {
  public async uploadModel ({ request }: HttpContextContract): Promise<{ id: number, name: string }> {
    const trx = await Database.transaction()

    try {
      const file = request.file('file')

      if (file) {
        await file.moveToDisk('models')

        if (file.fileName) {
          const model = new Model().useTransaction(trx)

          model.fill({
            name: file?.clientName ?? 'file',
            filename: file?.fileName,
          })

          await model.save()

          let parentId = request.qs().parentId

          if (parentId) {
            parentId = parseInt(parentId)

            if (isNaN(parentId)) {
              parentId = null
            }
          }

          const folder = new FolderItem().useTransaction(trx)

          folder.fill({
            name: model.name,
            itemId: model.id,
            parentId,
            type: 'model',
          })

          await folder.save()

          await trx.commit()

          return folder
        }
      }
    } catch (error) {
      await trx.rollback()
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
