import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Texture from 'App/Models/Texture'
import Drive from '@ioc:Adonis/Core/Drive'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'

export default class TexturesController {
  public async uploadTexture ({ request }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const file = request.file('file')

      if (file) {
        await file?.moveToDisk('textures')

        if (file.fileName) {
          const model = new Texture().useTransaction(trx)

          model.fill({
            name: file.clientName ?? 'file',
            filename: file.fileName,
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
  }

  public async getTexture ({ params }: HttpContextContract) {
    const texture = await Texture.findOrFail(params.id)

    return texture
  }

  public async getTextureFile ({ params, response }: HttpContextContract) {
    const texture = await Texture.findOrFail(params.id)

    response.stream(await Drive.getStream(`textures/${texture.filename}`))
  }

  public async updateTexture ({ request, params }: HttpContextContract) {
    const texture = await Texture.findOrFail(params.id)

    texture.merge(
      request.body(),
    )

    await texture.save()
  }

  public async deleteTexture ({ params }: HttpContextContract) {
    const texture = await Texture.find(params.id)

    if (texture) {
      Drive.delete(`textures/${texture.filename}`)
      await texture.delete()
    }
  }

  public async getTextureList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const textures = await Texture.all()

    return textures.map((t) => ({ id: t.id, name: t.name, flipY: t.flipY }))
  }
}
