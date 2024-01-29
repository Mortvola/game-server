import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Material from 'App/Models/Material'

export default class MaterialsController {
  public async uploadMaterial ({ request }: HttpContextContract): Promise<void> {
    try {
      const material = new Material()

      const payload = request.body()

      material.fill({
        name: payload.name,
        shaderId: payload.shaderId,
        properties: payload.properties,
      })

      await material.save()
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
