import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Texture from 'App/Models/Texture'
import Drive from '@ioc:Adonis/Core/Drive'

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

  public async getTexture ({ params }: HttpContextContract) {
    const texture = await Texture.findOrFail(params.id)

    return texture
  }

  public async getTextureFile ({ params, response }: HttpContextContract) {
    const texture = await Texture.findOrFail(params.id)

    response.stream(await Drive.getStream(`textures/${texture.filename}`))
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

    return textures.map((t) => ({ id: t.id, name: t.name }))
  }
}
