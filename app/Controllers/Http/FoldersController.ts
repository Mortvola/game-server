import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import Material from 'App/Models/Material'
import Model from 'App/Models/Model'
import ShaderDescriptor from 'App/Models/ShaderDescriptor'
import Texture from 'App/Models/Texture'
import Drive from '@ioc:Adonis/Core/Drive'
import Database from '@ioc:Adonis/Lucid/Database'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import Scene from 'App/Models/Scene'
import TreeNode from 'App/Models/TreeNode'
import SceneObject from 'App/Models/SceneObject'
import { deleteTree } from 'App/Models/TreeUtils'

export default class FoldersController {
  public async getFolder ({ params }: HttpContextContract) {
    const items = await FolderItem.query().where('parentId', params.id ?? null).orderBy('name')

    for (const item of items) {
      switch (item.type) {
        case ItemType.Scene:
          const scene = await Scene.find(item.itemId)

          if (scene) {
            item.name = scene.name
          }

          break

        case ItemType.Shader:
          const shader = await ShaderDescriptor.find(item.itemId)

          if (shader) {
            item.name = shader.name
          }

          break

        case ItemType.Material:
          const material = await Material.find(item.itemId)

          if (material) {
            item.name = material.name
          }

          break

        case ItemType.Texture:
          const texture = await Texture.find(item.itemId)

          if (texture) {
            item.name = texture.name
          }

          break

        case ItemType.Model:
          const model = await Model.find(item.itemId)

          if (model) {
            item.name = model.name
          }

          break

        case ItemType.TreeNode:
          const treeNode = await TreeNode.find(item.itemId)

          if (treeNode) {
            const sceneObject = await SceneObject.query()
              .where('nodeId', treeNode.id)
              .whereNull('modifier_node_id')
              .first()

            item.name = sceneObject?.name ?? 'Unknown'
          }

          break
      }
    }

    return items
  }

  public async updateFolder ({ request, params }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const item = await FolderItem.findOrFail(params.id, { client: trx })

      item.merge({
        ...request.body(),
      })

      const body = request.body()
      const name = body.name

      if (name !== undefined) {
        // For scenes, update the name in the scene object and the scene object's json data.
        switch (item.type) {
          case ItemType.Scene:
            const scene = await Scene.findOrFail(item.itemId, { client: trx })

            scene.name = name

            await scene.save()

            break

          case ItemType.Shader: {
            const shader = await ShaderDescriptor.findOrFail(item.itemId, { client: trx })

            shader.name = name

            await shader.save()

            break
          }

          case ItemType.Texture: {
            const texture = await Texture.findOrFail(item.itemId, { client: trx })

            texture.name = name

            await texture.save()

            break
          }

          case ItemType.Material: {
            const material = await Material.findOrFail(item.itemId, { client: trx })

            material.name = name

            await material.save()

            break
          }

          case ItemType.Model: {
            const model = await Model.findOrFail(item.itemId, { client: trx })

            model.name = name

            await model.save()

            break
          }

          case ItemType.TreeNode: {
            const treeNode = await TreeNode.findOrFail(item.itemId, { client: trx })

            if (treeNode) {
              const sceneObject = await SceneObject.query({ client: trx })
                .where('nodeId', treeNode.id)
                .whereNull('modifierNodeId')
                .firstOrFail()

              sceneObject.name = name

              await sceneObject.save()
            }

            break
          }
        }
      }

      await item.save()

      await trx.commit()

      return item
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async deleteItem ({ params }: HttpContextContract) {
    const trx = await Database.transaction()

    try {
      const item = await FolderItem.find(params.id, { client: trx })

      if (item) {
        await item.delete()

        switch (item.type) {
          case ItemType.Texture:
            const texture = await Texture.find(item.itemId, { client: trx })

            if (texture) {
              await Drive.delete(`textures/${texture.filename}`)
              await texture.delete()
            }
            break

          case ItemType.Material:
            const material = await Material.find(item.itemId, { client: trx })

            if (material) {
              await material.delete()
            }
            break

          case ItemType.Shader:
            const shader = await ShaderDescriptor.find(item.itemId, { client: trx })

            if (shader) {
              await shader.delete()
            }
            break

          case ItemType.Model:
            const model = await Model.find(item.itemId, { client: trx })

            if (model) {
              await Drive.delete(`models/${model.filename}`)
              await model.delete()
            }
            break

          case ItemType.TreeNode:
            const treeNode = await TreeNode.find(item.itemId, { client: trx })

            if (treeNode) {
              // If there are existing modifier nodes that use this
              // root then don't delete the node tree.
              const modifierNodes = await TreeNode.query({ client: trx })
                .where('rootNodeId', treeNode.id)

              if (modifierNodes.length > 0) {
                throw new Error(`Prefab ${treeNode.id} in use.`)
              }

              await deleteTree(treeNode, trx)
            }

            break

          case ItemType.Scene:
            const scene = await Scene.find(item.itemId, { client: trx })

            if (scene) {
              const rootNode = await TreeNode.find(scene.rootNodeId, { client: trx })

              if (rootNode) {
                await deleteTree(rootNode, trx)
              }

              await scene.delete()
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
      type: ItemType.Folder,
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
      type: requestData.type as ItemType,
    })

    await item.save()

    return item
  }
}
