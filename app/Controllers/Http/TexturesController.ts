import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Texture from 'App/Models/Texture'

export default class TexturesController {
  public async uploadTexture ({ request }: HttpContextContract): Promise<void> {
    try {
      const file = request.file('file')

      await file?.moveToDisk('textures')

      if (file?.fileName) {
        const model = new Texture()

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

  public async getTextureList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const models = await Texture.all()

    return models.map((t) => ({ id: t.id, name: t.name }))
  }
}
