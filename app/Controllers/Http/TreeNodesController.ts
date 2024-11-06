import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import Component from 'App/Models/Component'
import FolderItem, { ItemType } from 'App/Models/FolderItem'
import NodeModification from 'App/Models/NodeModification'
import Scene from 'App/Models/Scene'
import SceneObject from 'App/Models/SceneObject'
import TreeNode from 'App/Models/TreeNode'
import { schema } from '@ioc:Adonis/Core/Validator'
import {
  createPrefab,
  createTree, cyclicCheck,
  getTreeDescriptor, NodesResponse,
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
      const nodeId = parseInt(params.id, 10)
      const sceneId = parseInt(params.sceneId, 10)

      const descriptor = await getTreeDescriptor(
        nodeId,
        sceneId,
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
    const payload = await request.validate({
      schema: schema.create({
        subSceneId: schema.number(),
        parentNodeId: schema.number.nullable(),
        modifierNodeId: schema.number.nullable(),
        pathId: schema.number.nullable(),
      }),
    })

    const trx = await Database.transaction()

    try {
      const sceneId = parseInt(params.sceneId, 10)

      const scene = await Scene.findOrFail(payload.subSceneId)

      const treeDescriptor = await createTree(
        sceneId,
        scene,
        payload,
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
    const payload = await request.validate({
      schema: schema.create({
        previousParent: schema.object.optional().members({
          parentNodeId: schema.number.nullable(),
          modifierNodeId: schema.number.nullable(),
          pathId: schema.number.nullable(),
        }),
        parentNodeId: schema.number.nullable(),
        modifierNodeId: schema.number.nullable(),
        pathId: schema.number.nullable(),
      }),
    })

    const trx = await Database.transaction()

    try {
      const nodeId = parseInt(params.id, 10)
      const sceneId = parseInt(params.sceneId, 10)

      const modifications: NodeModification[] = []

      const node = await TreeNode.query({ client: trx })
        .where('id', nodeId)
        .where('sceneId', sceneId)
        .firstOrFail()

      // let objectDescriptors: SceneObjectDescriptor[] | undefined

      // If there is a previousParent property then that indicates
      // that there is a change of parent.
      if (payload.previousParent) {
        let modification = await unsetParent(node, payload.previousParent, trx)

        if (modification) {
          modifications.push(modification)
        }

        modification = await setParent(node, payload, trx)

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
    const payload = await request.validate({
      schema: schema.create({
        nodeId: schema.number(),
        folderId: schema.number(),
        parentNodeId: schema.number.nullable(),
        modifierNodeId: schema.number.nullable(),
        pathId: schema.number.nullable(),
      }),
    })

    const trx = await Database.transaction()

    try {
      const sceneId = parseInt(params.sceneId, 10)

      const { scene, root } = await createPrefab(payload.nodeId, sceneId, trx)

      const item = await new FolderItem()
        .useTransaction(trx)
        .fill({
          name: 'Unknown',
          itemId: scene.id,
          parentId: payload.folderId,
          type: ItemType.TreeNode,
        })
        .save()

      await setParent(root, payload, trx)

      const treeDescriptor = await getTreeDescriptor(root.id, root.sceneId, trx)

      await trx.commit()

      item.name = scene.name

      return {
        item,
        ...treeDescriptor,
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
      const nodeId = parseInt(params.id, 10)
      const sceneId = parseInt(params.sceneId, 10)

      const node = await TreeNode.query({ client: trx })
        .where('id', nodeId)
        .where('sceneId', sceneId)
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
