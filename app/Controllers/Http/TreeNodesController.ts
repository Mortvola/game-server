import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Component from 'App/Models/Component'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import NodeModification from 'App/Models/NodeModification'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import {
  createTree, cyclicCheck,
  getTreeDescriptor, NodesResponse2,
} from 'App/Models/TreeUtils'

export type ItemResponse = {
  item: FolderItem,
} & NodesResponse2

export default class TreeNodesController {
  public async get ({ params }: HttpContextContract): Promise<NodesResponse2 | undefined> {
    const trx = await Database.transaction()

    try {
      const descriptor = await getTreeDescriptor(
        parseInt(params.id, 10),
        parseInt(params.treeId, 10),
        trx,
      )

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
          // payload.modifierNodeId,
          // payload.path,
          // payload.pathId,
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

  public async patch ({ request, params }: HttpContextContract): Promise<void> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      const node = await TreeNode.query({ client: trx })
        .where('id', params.id)
        .where('treeId', params.treeId)
        .firstOrFail()

      // let objectDescriptors: SceneObjectDescriptor[] | undefined

      // If there is a previousParent property then that indicates
      // that there is a change of parent.
      if (payload.previousParent) {
        // If there is a modifierNodeId and related properties
        // then the node is being removed from that node modifier
        // as an added node.
        if (
          payload.previousParent.modifierNodeId !== null
          && payload.previousParent.pathId !== null
        ) {
          if (payload.previousParent.parentNodeId !== null) {
            throw new Error('Ambiguous previous parent information')
          }

          const modification = await NodeModification.query({ client: trx })
            .where('nodeId', payload.previousParent.modifierNodeId)
            .where('treeId', params.treeId)
            .where('pathId', payload.previousParent.pathId)
            .firstOrFail()

          if (modification) {
            const index = modification.addedNodes.findIndex((an) => an === node.id)

            if (index !== -1) {
              modification.addedNodes = [
                ...modification.addedNodes.slice(0, index),
                ...modification.addedNodes.slice(index + 1),
              ]

              await modification.save()
            }
          }
        }

        // If there is a modifierNodeId and related properties then the
        // node is being added as an addedNode to a node modifier
        if (
          payload.modifierNodeId !== null
          && payload.pathId !== null
        ) {
          if (payload.parentNodeId !== null) {
            throw new Error('Ambiguous parent information')
          }

          let modification = await NodeModification.query({ client: trx })
            .where('nodeId', payload.modifierNodeId)
            .where('treeId', params.treeId)
            .where('pathId', payload.pathId)
            .first()

          if (modification) {
            // Use a set to remove any duplicates
            modification.addedNodes = [
              ...new Set([
                ...modification.addedNodes,
                node.id,
              ]),
            ]
          } else {
            modification = new NodeModification()
              .useTransaction(trx)
              .fill({
                nodeId: payload.modifierNodeId,
                treeId: params.treeId,
                pathId: payload.pathId,
                addedNodes: [node.id],
              })
          }

          await modification.save()
        }

        node.parentNodeId = payload.parentNodeId

        await node.save()
      }

      if (payload.parentNodeId !== undefined) {
        if (await cyclicCheck(node, trx)) {
          throw new Error('Cycle found in tree')
        }
      }

      await trx.commit()

      // return {
      //   objects: objectDescriptors,
      // }
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
        // payload.modifierNodeId,
        // payload.path,
        // payload.pathId,
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
      const node = await TreeNode.query({ client: trx })
        .where('id', params.id)
        .where('treeId', params.treeId)
        .first()

      if (node) {
        const object = await SceneObject.find(node.sceneObjectId)

        if (object) {
          for (const compId of object.components) {
            const component = await Component.find(compId)

            if (component) {
              await component.delete()
            }
          }

          await object.delete()
        }

        const modifications = await NodeModification.query({ client: trx })
          .where('nodeId', node.id)
          .where('treeId', node.treeId)

        for (const mod of modifications) {
          await mod.delete()
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
