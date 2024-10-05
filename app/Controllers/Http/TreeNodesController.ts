import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem from 'App/Models/FolderItem'
import GameObject from 'App/Models/GameObject'
import TreeNode from 'App/Models/TreeNode'
import {
  createTree, generateOverrideObjects2, getTreeDescriptor, NodesResponse, SceneObjectDescriptor, TreeNodeDescriptor,
} from 'App/Models/TreeUtils'

export type ItemResponse = { item: FolderItem, root?: TreeNodeDescriptor, objects?: any[] }

export default class TreeNodesController {
  public async get ({ params }: HttpContextContract): Promise<NodesResponse | undefined> {
    const trx = await Database.transaction()

    try {
      const descriptor = await getTreeDescriptor(params.id, trx)

      // trx.commit()
      trx.rollback()

      return descriptor
    } catch (error) {
      trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async post ({ request }: HttpContextContract): Promise<NodesResponse | undefined> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      let treeDescriptor: NodesResponse | undefined

      if (payload.rootNodeId !== undefined) {
        treeDescriptor = await createTree(payload.rootNodeId, payload.parentNodeId, trx)
      }

      await trx.commit()

      if (treeDescriptor) {
        return treeDescriptor
      }
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async patch ({ request, params }: HttpContextContract): Promise<unknown | undefined> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      let objectDescriptors: SceneObjectDescriptor[] | undefined

      if (payload.parentNodeId !== undefined) {
        const node = await TreeNode.findOrFail(params.id, { client: trx })

        // if (node.parentNodeId !== null && node.parentSubnodeId === payload.parentNodeId) {
        //   objectDescriptors = await generateOverrideObjects2(params.id, trx)
        // }

        node.merge({
          parentNodeId: payload.parentNodeId,
          parentSubnodeId: payload.parentSubnodeId,
        })

        await node.save()

        objectDescriptors = await generateOverrideObjects2(params.id, trx)
      }

      // await trx.commit()
      await trx.rollback()

      return {
        objects: objectDescriptors,
      }
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async postTree ({ request }: HttpContextContract): Promise<ItemResponse | undefined> {
    const trx = await Database.transaction()

    const payload = request.body()

    try {
      const node = await TreeNode.findOrFail(payload.nodeId, { client: trx })

      // Find the root game object to get the name for the folder item.
      let root = node
      while (root.rootNodeId !== null) {
        root = await TreeNode.findOrFail(root.rootNodeId, { client: trx })
      }
      const nodeObject = await GameObject.query({client: trx })
        .where('nodeId', root.id)
        .andWhereNull('subnodeId')
        .firstOrFail()

      const item = new FolderItem().useTransaction(trx)

      item.fill({
        name: node.name ? node.name : 'Unknown',
        itemId: payload.nodeId,
        parentId: payload.folderId,
        type: 'tree-node',
      })

      await item.save()

      let nodesResponse: NodesResponse | undefined

      if (node.parentNodeId) {
        nodesResponse = await createTree(node.id, node.parentNodeId, trx)

        node.parentNodeId = null
        await node.save()
      }

      await trx.commit()

      return {
        item,
        ...nodesResponse,
      }
    } catch (error) {
      trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async delete ({ params }: HttpContextContract): Promise<void> {
    const trx = await Database.transaction()

    try {
      const node = await TreeNode.find(params.id, { client: trx })

      if (node) {
        const object = await GameObject.findBy('nodeId', node.id, { client: trx })

        if (object) {
          await object.delete()
        }

        await node.delete()
      }

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }
}
