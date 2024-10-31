import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Scene from 'App/Models/Scene'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import TreeNode from 'App/Models/TreeNode'
import SceneObject from 'App/Models/SceneObject'
import { getUniqueId } from 'App/Models/TreeUtils'

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
          id: await getUniqueId(),
        })
        .save()

      await new SceneObject()
        .useTransaction(trx)
        .fill({
          name: 'root',
          // object: {
          //   type: ObjectType.NodeObject,
          //   components: [],
          // },
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

      const folderItem = await FolderItem.addFolderItem(scene.name, scene.id, ItemType.Scene, parentId, trx)

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
    const scene = await Scene.findOrFail(params.id)

    const requestData = await request.validate({
      schema: schema.create({
        name: schema.string([rules.trim()]),
      }),
    })

    scene.merge({
      name: requestData.name,
    })

    await scene.save()
  }
}
