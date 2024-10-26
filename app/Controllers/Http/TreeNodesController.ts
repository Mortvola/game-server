import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import {
  createTree, cyclicCheck,
  getTreeDescriptor, NodesResponse2, SceneObjectDescriptor,
} from 'App/Models/TreeUtils'

export type ItemResponse = {
  item: FolderItem,
} & NodesResponse2

export default class TreeNodesController {
  public async get ({ params }: HttpContextContract): Promise<NodesResponse2 | undefined> {
    const trx = await Database.transaction()

    try {
      const descriptor = await getTreeDescriptor(parseInt(params.id, 10), trx)

      trx.commit()

      return descriptor
    } catch (error) {
      trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async post ({ request }: HttpContextContract): Promise<NodesResponse2 | undefined> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      let treeDescriptor: NodesResponse2 | undefined

      if (payload.rootNodeId !== undefined) {
        treeDescriptor = await createTree(
          payload.rootNodeId,
          payload.parentNodeId,
          payload.modifierNodeId,
          payload.path,
          payload.pathId,
          trx,
        )
      }

      await trx.commit()

      return treeDescriptor
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
      const node = await TreeNode.findOrFail(params.id, { client: trx })

      let objectDescriptors: SceneObjectDescriptor[] | undefined

      // let parentChanged = false

      if (payload.parentNodeId !== undefined) {
        // parentChanged = payload.parentNodeId !== node.parentNodeId

        node.parentNodeId = payload.parentNodeId
      }

      if (payload.modifierNodeId !== undefined) {
        node.modifierNodeId = payload.modifierNodeId
      }

      if (payload.path !== undefined) {
        node.path = payload.path
      }

      if (payload.pathId !== undefined) {
        node.pathId = payload.pathId
      }

      // Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);

      // node.merge({
      //   parentNodeId: payload.parentNodeId,
      //   parentWrapperId: payload.parentWrapperId,
      //   name: payload.name,
      // })

      await node.save()

      if (payload.parentNodeId !== undefined) {
        if (await cyclicCheck(node, trx)) {
          throw new Error('Cycle found in tree')
        }
      }

      // if (parentChanged && node.parentNodeId !== null) {
      //   // Find all wrappers above this parental change
      //   const wrappers: TreeNode[] = []

      //   let stack: number[] = [node.parentNodeId]

      //   while (stack.length > 0) {
      //     const nodeId = stack[0]
      //     stack = stack.slice(1)

      //     let n = await TreeNode.findOrFail(nodeId, { client: trx })

      //     if (n.rootNodeId !== null) {
      //       wrappers.push(n)
      //     }

      //     if (n.parentNodeId === null) {
      //       // Find a wrapper node that contains this node
      //       const wrappers = await TreeNode.query({ client: trx })
      //         .where('rootNodeId', nodeId)

      //       stack.push(...wrappers.map((w) => w.id))
      //     } else {
      //       stack.push(n.parentNodeId)
      //     }
      //   }

      //   for (const wrapper of wrappers) {
      //     const addedNodes = await TreeNode.query({ client: trx })
      //       .where('parentWrapperId', wrapper.id)

      //     // Compute path IDs
      //     for (const addedNode of addedNodes) {
      //       if (addedNode.parentNodeId === null) {
      //         throw new Error('parent node is null')
      //       }

      //       const { id, path } = await getPathId(addedNode.parentNodeId, wrapper.id, trx)

      //       if (id !== addedNode.pathId) {
      //         addedNode.pathId = id
      //         addedNode.path = path

      //         await addedNode.save()
      //       }
      //     }
      //   }
      // }

      if (payload.parentNodeId !== undefined) {
        // if (node.parentWrapperId !== null && node.parentNodeId === payload.parentNodeId) {
        //   objectDescriptors = await generateOverrideObjects2(params.id, trx)
        // }

        // objectDescriptors = await generateOverrideObjects2(node.rootNodeId ?? node.id, trx)
      }

      await trx.commit()

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

      // Find the root scene object to get the name for the folder item.
      // let root = node
      // while (root.rootNodeId !== null) {
      //   root = await TreeNode.findOrFail(root.rootNodeId, { client: trx })
      // }

      const item = new FolderItem().useTransaction(trx)

      item.fill({
        name: 'Unknown',
        itemId: payload.nodeId,
        parentId: payload.folderId,
        type: ItemType.TreeNode,
      })

      await item.save()

      // if (node.parentNodeId) {
      const nodesResponse = await createTree(
        node.id,
        node.parentNodeId,
        payload.modifierNodeId,
        payload.path,
        payload.pathId,
        trx,
      )

      node.parentNodeId = null
      await node.save()
      // }

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
        const object = await SceneObject.findBy('nodeId', node.id, { client: trx })

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
