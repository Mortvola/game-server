import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import Material from 'App/Models/Material'

export default class MaterialsController {
  public async uploadMaterial ({ request }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const material = new Material().useTransaction(trx)

      const payload = request.body()

      material.fill({
        name: payload.name,
        shaderId: payload.shaderId,
        properties: payload.properties,
      })

      await material.save()

      let parentId = request.qs().parentId

      if (parentId) {
        parentId = parseInt(parentId)

        if (isNaN(parentId)) {
          parentId = null
        }
      }

      const folder = new FolderItem().useTransaction(trx)

      folder.fill({
        name: material.name,
        itemId: material.id,
        parentId,
        type: 'material',
      })

      await folder.save()

      await trx.commit()

      return folder
    } catch (error) {
      console.log(error)
      throw error
    }
  }

  public async getMaterial ({ params }: HttpContextContract) {
    return Material.findOrFail(params.id)
  }

  public async updateMaterial ({ params, request }: HttpContextContract) {
    const material = await Material.findOrFail(params.id)

    material.merge(
      request.body(),
    )

    await material.save()
  }

  public async deleteMaterial ({ params }: HttpContextContract) {
    const material = await Material.find(params.id)

    if (material) {
      await material.delete()
    }
  }

  public async getMaterialList ({}: HttpContextContract): Promise<Material[]> {
    const materials = await Material.all()

    return materials
  }
}
