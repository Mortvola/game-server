import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import FolderItem from 'App/Models/FolderItem'
import GameObject from 'App/Models/GameObject'
import Material from 'App/Models/Material'
import Model from 'App/Models/Model'
import ShaderDescriptor from 'App/Models/ShaderDescriptor'
import Texture from 'App/Models/Texture'
import Drive from '@ioc:Adonis/Core/Drive'
import Database from '@ioc:Adonis/Lucid/Database'
import Particle from 'App/Models/Particle'
import { schema, rules } from '@ioc:Adonis/Core/Validator'

export default class FoldersController {
  public async getFolder ({ params }: HttpContextContract) {
    const items = await FolderItem.query().where('parentId', params.id ?? null).orderBy('name')

    return items
  }

  public async updateFolder ({ request, params }: HttpContextContract) {
    const item = await FolderItem.findOrFail(params.id)

    item.merge({
      ...request.body(),
    })

    await item.save()

    return item
  }

  public async deleteItem ({ params }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const item = await FolderItem.find(params.id, { client: trx })

      if (item) {
        await item.delete()

        switch (item.type) {
          case 'object':
            const object = await GameObject.find(item.itemId, { client: trx })

            if (object) {
              await object.delete()
            }
            break

          case 'texture':
            const texture = await Texture.find(item.itemId, { client: trx })

            if (texture) {
              await Drive.delete(`textures/${texture.filename}`)
              await texture.delete()
            }
            break

          case 'material':
            const material = await Material.find(item.itemId, { client: trx })

            if (material) {
              await material.delete()
            }
            break

          case 'shader':
            const shader = await ShaderDescriptor.find(item.itemId, { client: trx })

            if (shader) {
              await shader.delete()
            }
            break

          case 'model':
            const model = await Model.find(item.itemId, { client: trx })

            if (model) {
              await Drive.delete(`models/${model.filename}`)
              await model.delete()
            }
            break

          case 'particle':
            const particle = await Particle.find(item.itemId, { client: trx })

            if (particle) {
              await particle.delete()
            }
            break
        }
      }

      await trx.commit()
    } catch (error) {
      await trx.rollback()

      throw error
    }
  }

  public async makeFolder ({ request }: HttpContextContract) {
    const folder = new FolderItem()

    const body = request.body()

    folder.fill({
      name: body.name,
      itemId: null,
      parentId: body.parentId,
      type: 'folder',
    })

    await folder.save()

    return folder
  }

  public async makeItem ({ request }: HttpContextContract) {
    const requestData = await request.validate({
      schema: schema.create({
        parentId: schema.number(),
        name: schema.string([rules.trim()]),
        itemId: schema.number(),
        type: schema.string([rules.trim()]),
      }),
    })

    const item = new FolderItem()

    item.fill({
      name: requestData.name,
      itemId: requestData.itemId,
      parentId: requestData.parentId,
      type: requestData.type,
    })

    await item.save()

    return item
  }
}
