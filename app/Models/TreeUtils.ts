import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import GameObject from './GameObject'

export type TreeNodeDescriptor = {
  id: number,
  name?: string,
  treeId?: number,
  children: TreeNodeDescriptor[],
}

export type SceneObjectDescriptor = {
  nodeId: number,
  treeId?: number,

  object: unknown,

  rootId?: number,
}

export type NodesResponse = {
  root: TreeNodeDescriptor,
  objects: SceneObjectDescriptor[],
  trees: { id: number, name: string }[],
}

export const createOverrideObject = async (
  treeId: number,
  baseObject: GameObject,
  trx: TransactionClientContract,
) => {
  const overrideObject = new GameObject().useTransaction(trx)

  overrideObject.fill({
    nodeId: baseObject.nodeId,
    treeId: treeId,
    object: {
      type: 'object',
      components: [],
    },
  })

  // await overrideObject.save()

  console.log(`created override objectx for ${baseObject.nodeId} in tree ${treeId}`)

  return overrideObject
}

export const getRoot = async (node: TreeNode, trx: TransactionClientContract) => {
  let root = node

  while (root) {
    if (root.parentNodeId === null) {
      return root
    }

    root = await TreeNode.findOrFail(root.parentNodeId, { client: trx })
  }

  throw new Error('root not found')
}

export const generateOverrideObjects2 = async (
  nodeId: number,
  trx: TransactionClientContract,
): Promise<SceneObjectDescriptor[]> => {
  let node: null | TreeNode = await TreeNode.findOrFail(nodeId, { client: trx })
  const baseObject = await GameObject.query({ client: trx })
    .where('nodeId', nodeId)
    .andWhereNull('treeId')
    .firstOrFail()

  type StackEntry = { node: TreeNode, baseObject: GameObject, baseTreeId: number | undefined }
  let stack: StackEntry[] = [{ node, baseObject, baseTreeId: undefined }]

  const objects: { object: GameObject, rootId: number }[] = []

  while (stack.length > 0) {
    const { node, baseObject } = stack[0]
    stack = stack.slice(1)

    const root = await getRoot(node, trx)

    objects.push({ object: baseObject, rootId: root.id })

    // Found the root of the current tree. Determine if the root
    // is contained in another tree.
    const trees = await TreeNode.query({ client: trx })
      .where('rootNodeId', root.id)

    for (const tree of trees) {
      // Found tree that contains the root
      // Ensure that there is an object for the original node at this tree level.
      let object = await GameObject.query({ client: trx })
        .where('nodeId', nodeId)
        .andWhere('treeId', tree.id)
        .first()

      if (!object) {
        // An object does not exist so create one.
        object = await createOverrideObject(tree.id, baseObject, trx)
      }

      stack.push({ node: tree, baseObject: object, baseTreeId: baseObject.treeId ?? undefined })
    }
  }

  return objects.map((entry) => ({
    nodeId: entry.object.nodeId,
    treeId: entry.object.treeId ?? undefined,
    object: entry.object.object,
    rootId: entry.rootId,
  }))
}

export const generateOverrideObjects = async (treeId: number, rootNodeId: number, trx: TransactionClientContract) => {
  type StackEntry = { node: TreeNode, subtrees: number[] }
  let stack: StackEntry[] = [{
    node: await TreeNode.findOrFail(rootNodeId, { client: trx }),
    subtrees: [],
  }]

  while (stack.length > 0) {
    const { node, subtrees } = stack[0]
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const object = await GameObject.findByOrFail('nodeId', node.id, { client: trx })

      await createOverrideObject(treeId, object, trx)

      const children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)
        .andWhereNull('parentTreeId')

      stack = stack.concat(children.map((child) => ({ node: child, subtrees })))

      // Look for any override connections at any of the current subtree levels.
      for (let i = 0; i < subtrees.length; i += 1) {
        const children = await TreeNode.query({ client: trx })
          .where('parentTreeId', subtrees[i])
          .where('parentNodeId', node.id)

        stack = stack.concat(children.map((child) => ({
          node: child,
          subtrees: subtrees.slice(0, i),
        })))
      }
    } else {
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack = stack.concat([{ node: root, subtrees: [...subtrees, node.id] }])
    }
  }
}

export const getTreeDescriptor = async (
  rootNodeId: number,
  trx: TransactionClientContract
): Promise<NodesResponse | undefined> => {
  type StackEntry = {
    node: TreeNode,
    name: string,
    parent: TreeNodeDescriptor | undefined,
    treeId: number | undefined,
    subtrees: TreeNode[],
  }

  const start = await TreeNode.findOrFail(rootNodeId, { client: trx })

  let stack: StackEntry[] = [{
    node: start,
    name: start.name,
    parent: undefined,
    treeId: undefined,
    subtrees: [],
  }]

  let root: TreeNodeDescriptor | undefined

  const objects: Map<string, SceneObjectDescriptor> = new Map()
  const trees: Map<number, string> = new Map()

  while (stack.length > 0) {
    const entry = stack[0]
    const { node, name, parent, treeId, subtrees } = entry
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const result: TreeNodeDescriptor = {
        id: node.id,
        name,
        treeId,
        children: [],
      }

      if (parent === undefined) {
        root = result
      } else {
        parent.children.push(result)
      }

      const objs = await generateOverrideObjects2(node.id, trx)

      for (const o of objs) {
        objects.set(`${o.nodeId}-${o.treeId}`, o)
      }

      let children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)
        .andWhereNull('parentTreeId')

      stack = stack.concat(children.map((child) => ({
        node: child,
        name: child.name,
        parent: result,
        treeId,
        subtrees,
      })))

      // Look for any override connections at any of the current subtree levels.
      for (let i = 0; i < subtrees.length; i += 1) {
        children = await TreeNode.query({ client: trx })
          .where('parentTreeId', subtrees[i].id)
          .where('parentNodeId', node.id)

        // If the treeId matches the subtreeId then we must be leaving the tree of treeId and
        // it should be set to undefined.
        stack = stack.concat(children.map((child) => ({
          node: child,
          name: child.name,
          parent: result,
          treeId: treeId !== subtrees[i].id ? treeId : undefined,
          subtrees: subtrees.slice(0, i),
        })))
      }
    } else {
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack.push({
        node: root,
        name: node.name, // Use the name of the node enclosing the root
        parent,
        treeId: treeId ?? node.id,
        subtrees: [...subtrees, node],
      })

      trees.set(root.id, root.name)
    }
  }

  if (root) {
    return {
      root,
      objects: Array.from(objects).map(([, o]) => o),
      trees: Array.from(trees).map(([id, name]) => ({ id, name })),
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
