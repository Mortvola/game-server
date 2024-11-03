import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Component from 'App/Models/Component'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import NodeModification from 'App/Models/NodeModification'
import Scene from 'App/Models/Scene'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import {
  createTree, cyclicCheck,
  getTreeDescriptor, NodesResponse,
  ParentDescriptor,
  setParent,
  unsetParent,
} from 'App/Models/TreeUtils'

export type ItemResponse = {
  item: FolderItem,
} & NodesResponse

export default class TreeNodesController {
  public async get ({ params }: HttpContextContract): Promise<NodesResponse | undefined> {
    const trx = await Database.transaction()

    try {
      const descriptor = await getTreeDescriptor(
        parseInt(params.id, 10),
        parseInt(params.sceneId, 10),
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

  public async post ({ request, params }: HttpContextContract): Promise<NodesResponse | undefined> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      const scene = await Scene.findOrFail(payload.subSceneId)

      const treeDescriptor = await createTree(
        params.sceneId,
        scene.rootNodeId,
        scene.id,
        payload as ParentDescriptor,
        trx,
      )

      await trx.commit()

      return treeDescriptor
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async patch ({ request, params }: HttpContextContract): Promise<NodeModification[]> {
    const payload = request.body()

    const trx = await Database.transaction()

    try {
      const modifications: NodeModification[] = []

      const node = await TreeNode.query({ client: trx })
        .where('id', params.id)
        .where('sceneId', params.sceneId)
        .firstOrFail()

      // let objectDescriptors: SceneObjectDescriptor[] | undefined

      // If there is a previousParent property then that indicates
      // that there is a change of parent.
      if (payload.previousParent) {
        let modification = await unsetParent(node, payload.previousParent as ParentDescriptor, trx)

        if (modification) {
          modifications.push(modification)
        }

        modification = await setParent(node, payload as ParentDescriptor, trx)

        if (modification) {
          modifications.push(modification)
        }

        await node.save()
      }

      if (payload.parentNodeId !== undefined) {
        if (await cyclicCheck(node, trx)) {
          throw new Error('Cycle found in tree')
        }
      }

      await trx.commit()

      return modifications
    } catch (error) {
      await trx.rollback()
      console.log(error)
      throw error
    }
  }

  public async postTree ({ request, params }: HttpContextContract): Promise<ItemResponse | undefined> {
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

      const nodesResponse = await createTree(
        params.sceneId,
        node.id,
        node.sceneId,
        payload as ParentDescriptor,
        // payload.modifierNodeId,
        // payload.path,
        // payload.pathId,
        trx,
      )

      await node.save()

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
        .where('sceneId', params.sceneId)
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

        let modifications = await NodeModification.query({ client: trx })
          .where('nodeId', node.id)
          .where('sceneId', node.sceneId)

        for (const mod of modifications) {
          await mod.delete()
        }

        // Delete any appearance of this node in the node modification addedNodes.
        modifications = await NodeModification.query({ client: trx })
          .where('sceneId', node.sceneId)
          .whereRaw(`added_nodes @> \'${node.id}\'::jsonb`)

        for (const mod of modifications) {
          mod.addedNodes = mod.addedNodes.filter((id) => id !== node.id)

          await mod.save()
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
