import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import GameObject from 'App/Models/GameObject'
import Prefab from 'App/Models/Prefab'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import FolderItem from 'App/Models/FolderItem'

export default class PrefabsController {
  public async post ({ request }: HttpContextContract) {
    const trx = await Database.transaction()
    try {
      const prefab = new Prefab().useTransaction(trx)

      const requestData = await request.validate({
        schema: schema.create({
          parentId: schema.number.optional(),
          name: schema.string([rules.trim()]),
          prefab: schema.object().anyMembers(),
        }),
      })

      prefab.fill({
        name: requestData.name,
        prefab: requestData.prefab,
      })

      await prefab.save()

      const item = await FolderItem.addFolderItem(
        requestData.name,
        prefab.id,
        'prefab',
        requestData.parentId ?? null,
        trx,
      )

      await trx.commit()

      return item
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async get ({ params }: HttpContextContract) {
    const prefab = await Prefab.findOrFail(params.id)

    return prefab
  }

  public async patch ({ request, params }: HttpContextContract) {
    const prefab = await Prefab.findOrFail(params.id)

    prefab.merge(
      request.body(),
    )

    await prefab.save()
  }

  public async delete ({ params }: HttpContextContract) {
    const prefab = await Prefab.find(params.id)

    if (prefab) {
      await prefab.delete()
    }
  }

  public async getList ({}: HttpContextContract) {
    const objects = await GameObject.all()

    for (let i = 0; i < objects.length; i += 1) {
      const oldObject = objects[i].object as {
        modelId: number,
        materials: unknown,
        items?: unknown[],
        x?: number,
        y?: number,
        width?: number,
        height?: number,
      }

      if (oldObject.modelId !== undefined) {
        const newObject: {
          items: unknown[],
        } = {
          items: [],
        }

        newObject.items.push({ item: { id: oldObject.modelId, materials: oldObject.materials }, type: 'model' })

        objects[i].object = newObject
      } else if (oldObject.x !== undefined && oldObject.y !== undefined) {
        objects[i].object = { ...oldObject }
      } else if (oldObject.items === undefined) {
        objects[i].object = { items: [] }
      }
    }
    return objects
  }
}
