import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import GameObject from './GameObject'

export type TreeNodeDescriptor = {
  id: number,
  treeId?: number,
  objectId: number,
  children: TreeNodeDescriptor[],
}

export type NodesResponse = { root: TreeNodeDescriptor, objects: any[] }

export const generateOverrideObjects = async (treeId: number, rootNodeId: number, trx: TransactionClientContract) => {
  let stack: { node: TreeNode, subTreeId: number | undefined }[] = [{
    node: await TreeNode.findOrFail(rootNodeId, { client: trx }),
    subTreeId: undefined,
  }]

  while (stack.length > 0) {
    const { node, subTreeId } = stack[0]
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const object = await GameObject.findByOrFail('nodeId', node.id, { client: trx })

      const overrideObject = new GameObject().useTransaction(trx)

      overrideObject.fill({
        name: '',
        nodeId: treeId,
        subnodeId: object.nodeId,
        object: {
          type: 'object',
          components: [],
        },
        baseObjectId: object.id,
      })

      await overrideObject.save()

      const children = await TreeNode.query({ client: trx }).where('parentNodeId', node.id)

      stack = stack.concat(children.map((child) => ({ node: child, subTreeId })))
    } else {
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack = stack.concat([{ node: root, subTreeId: node.id }])
    }
  }
}

export const getTreeDescriptor = async (
  rootNodeId: number,
  trx?: TransactionClientContract
): Promise<NodesResponse | undefined> => {
  type StackEntry = {
    node: TreeNode,
    parent: TreeNodeDescriptor | undefined,
    treeId: number | undefined,
    subtreeId: number | undefined,
  }

  let stack: StackEntry[] = [{
    node: await TreeNode.findOrFail(rootNodeId, { client: trx }),
    parent: undefined,
    treeId: undefined,
    subtreeId: undefined,
  }]

  let root: TreeNodeDescriptor | undefined

  const objectMap: Map<number, GameObject> = new Map()

  while (stack.length > 0) {
    const entry = stack[0]
    const { node, parent, treeId, subtreeId } = entry
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      let object: GameObject

      if (treeId) {
        object = await GameObject.query({ client: trx })
          .where('nodeId', treeId)
          .where('subnodeId', node.id)
          .firstOrFail()
      } else {
        object = await GameObject.findByOrFail('nodeId', node.id, { client: trx })
      }

      const result = {
        id: node.id,
        treeId: treeId,
        objectId: object.id,
        children: [],
      }

      if (parent === undefined) {
        root = result
      } else {
        parent.children.push(result)
      }

      // Store this and all base objects in the object map.
      while (object) {
        if (!objectMap.has(object.id)) {
          objectMap.set(object.id, object)
        }

        if (object.baseObjectId === null) {
          break
        }

        object = await GameObject.findOrFail(object.baseObjectId, { client: trx })
      }

      let children = await TreeNode.query({ client: trx }).where('parentNodeId', node.id)

      stack = stack.concat(children.map((child) => ({ node: child, parent: result, treeId, subtreeId })))

      if (subtreeId !== undefined) {
        children = await TreeNode.query({ client: trx })
          .where('parentNodeId', subtreeId)
          .where('parentSubnodeId', node.id)

        // If the treeId matches the subtreeId then we must be leaving the tree of treeId and
        // it should be set to undefined.
        stack = stack.concat(children.map((child) => ({
          node: child,
          parent: result,
          treeId: treeId !== subtreeId ? treeId : undefined,
          subtreeId: undefined,
        })))
      }
    } else {
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack = stack.concat([{ node: root, parent, treeId: treeId ?? node.id, subtreeId: node.id }])
    }
  }

  if (root) {
    return {
      root,
      objects: Array.from(objectMap).map(([, object]) => ({
        id: object.id,
        name: object.name,
        object: object.object,
        baseObjectId: object.baseObjectId ?? undefined,
      })),
    }
  }
}

export const createTree = async (rootNodeId: number, parentNodeId: number, trx: TransactionClientContract) => {
  const rootNode = new TreeNode().useTransaction(trx)

  rootNode.fill({
    parentNodeId,
    rootNodeId,
  })

  await rootNode.save()

  await generateOverrideObjects(rootNode.id, rootNodeId, trx)

  return getTreeDescriptor(rootNode.id, trx)
}
