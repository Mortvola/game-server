import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Scene from 'App/Models/Scene'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import TreeNode from 'App/Models/TreeNode'
import GameObject, { ObjectType } from 'App/Models/GameObject'

export default class ScenesController {
  public async uploadScene ({ request }: HttpContextContract) {
    const requestData = await request.validate({
      schema: schema.create({
        name: schema.string([rules.trim()]),
      }),
    })

    const trx = await Database.transaction()

    try {
      const treeNode = await new TreeNode()
        .useTransaction(trx)
        .fill({
          name: 'root',
        })
        .save()

      await new GameObject()
        .useTransaction(trx)
        .fill({
          object: {
            type: ObjectType.NodeObject,
            components: [],
          },
          nodeId: treeNode.id,
        })
        .save()

      const scene = await new Scene()
        .useTransaction(trx)
        .fill({
          name: requestData.name,
          rootNodeId: treeNode.id,
        })
        .save()

      let parentId = request.qs().parentId

      if (parentId) {
        parentId = parseInt(parentId)

        if (isNaN(parentId)) {
          parentId = null
        }
      }

      const folderItem = await FolderItem.addFolderItem(scene.name, scene.id, 'scene', parentId, trx)

      await trx.commit()

      return folderItem
    } catch(error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async getScene ({ params }: HttpContextContract) {
    return Scene.findOrFail(params.id)
  }

  public async updateScene ({ request, params }: HttpContextContract) {
    const particleSystem = await Scene.findOrFail(params.id)

    const requestData = await request.validate({
      schema: schema.create({
        name: schema.string([rules.trim()]),
        scene: schema.object().members({
          objects: schema.number(),
        }),
      }),
    })

    particleSystem.merge({
      name: requestData.name,
      scene: requestData.scene,
    })

    await particleSystem.save()
  }
}
