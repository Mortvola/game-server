import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import ShaderDescriptor from 'App/Models/ShaderDescriptor'

export default class FilesController {
  public async getShaderDescriptor ({ params }: HttpContextContract): Promise<unknown> {
    const shader = await ShaderDescriptor.findOrFail(params.id)

    // Change the key 'graph' to 'graphDescriptor'.
    if (
      (shader.descriptor as { graph: unknown }).graph !== undefined &&
      (shader.descriptor as { graphDescriptor: unknown }).graphDescriptor === undefined
    ) {
      (shader.descriptor as { graphDescriptor: unknown }).graphDescriptor
        = (shader.descriptor as { graph: unknown }).graph
      delete (shader.descriptor as { graph: unknown }).graph
    }

    return shader
  }

  public async uploadShaderDescriptor ({ request }: HttpContextContract): Promise<{ id: number }> {
    const trx = await Database.transaction()

    try {
      const t = request.body()

      const shader = await new ShaderDescriptor().useTransaction(trx)

      shader.fill({
        name: t.name,
        descriptor: t.descriptor,
      })

      await shader.save()

      let parentId = request.qs().parentId

      if (parentId) {
        parentId = parseInt(parentId)

        if (isNaN(parentId)) {
          parentId = null
        }
      }

      const folder = new FolderItem().useTransaction(trx)

      folder.fill({
        name: shader.name,
        itemId: shader.id,
        parentId,
        type: 'shader',
      })

      await folder.save()

      await trx.commit()

      return folder
    } catch (error) {
      trx.rollback()
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
