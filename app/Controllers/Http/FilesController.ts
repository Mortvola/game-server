import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ShaderDescriptor from 'App/Models/ShaderDescriptor'

export default class FilesController {
  public async getShaderDescriptor ({ params }: HttpContextContract): Promise<unknown> {
    const descriptor = await ShaderDescriptor.findOrFail(params.id)

    return {
      name: descriptor.name,
      descriptor: descriptor.descriptor,
    }
  }

  public async uploadShaderDescriptor ({ request }: HttpContextContract): Promise<{ id: number }> {
    try {
      const t = request.body()

      const shaderDescriptor = await ShaderDescriptor.create({
        name: t.name,
        descriptor: t.descriptor,
      })

      return ({ id: shaderDescriptor.id })
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async updateShaderDescriptor ({ request, params }: HttpContextContract): Promise<void> {
    try {
      const shaderDescriptor = await ShaderDescriptor.findOrFail(params.id)

      const t = request.body()

      shaderDescriptor.merge({
        name: t.name,
        descriptor: t.descriptor,
      })

      await shaderDescriptor.save()
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async deleteShaderDescriptor ({ request, params }: HttpContextContract): Promise<void> {
    const shaderDescriptor = await ShaderDescriptor.find(params.id)

    if (shaderDescriptor) {
      await shaderDescriptor.delete()
    }
  }

  public async getShaderList ({}: HttpContextContract): Promise<{ id: number, name: string }[]> {
    const descriptors = await ShaderDescriptor.all()

    return descriptors.map((d) => ({ id: d.id, name: d.name }))
  }
}
