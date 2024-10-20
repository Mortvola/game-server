import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import GameObject from './GameObject'

export type TreeNodeDescriptor = {
  id: number,
  name?: string,
  wrapperId?: number,
  parentWrapperId?: number,
  // connectionOverride?: boolean,
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
  nodeId: number,
  trx: TransactionClientContract,
) => {
  const overrideObject = new GameObject().useTransaction(trx)

  overrideObject.fill({
    nodeId,
    treeId,
    object: {
      type: 'object',
      components: [],
    },
  })

  // await overrideObject.save()

  // console.log(`created override objectx for ${baseObject.nodeId} in tree ${treeId}`)

  return overrideObject
}

export const cyclicCheck = async (node: TreeNode, trx: TransactionClientContract) => {
  let child: TreeNode | null = node

  while (child) {
    let parentNode: TreeNode | null = null

    if (child.parentWrapperId !== null) {
      parentNode = await TreeNode.findOrFail(child.parentWrapperId, { client: trx })
    }

    if (child.parentNodeId !== null) {
      parentNode = await TreeNode.findOrFail(child.parentNodeId, { client: trx })
    }

    if (parentNode?.id === node.id) {
      return true
    }

    child = parentNode
  }

  return false
}

const getRoot = async (node: TreeNode, trx: TransactionClientContract): Promise<TreeNode> => {
  let root = node

  for (;;) {
    if (root.parentWrapperId !== null) {
      root = await TreeNode.findOrFail(root.parentWrapperId, { client: trx })
    } else if (root.parentNodeId !== null) {
      root = await TreeNode.findOrFail(root.parentNodeId, { client: trx })
    } else {
      break
    }
  }

  return root
}

const getObjectHierarchy = async (
  node: TreeNode,
  treeId: number,
  trx: TransactionClientContract,
): Promise<number[] | undefined> => {
  // Find the root of the tree that contains this node.
  const root = await getRoot(node, trx)

  // Get all of the trees that may have this node as a root.
  const trees = await TreeNode.query({ client: trx }).where('rootNodeId', root.id)

  // For each tree check to see if it is the tree we are looking for.
  // If it is not then continue the process using the tree.
  for (const tree of trees) {
    if (tree.id === treeId) {
      return [tree.id]
    }

    const results = await getObjectHierarchy(tree, treeId, trx)

    if (results !== undefined) {
      return [tree.id, ...results]
    }
  }
}

export const generateOverrideObjects2 = async (
  nodeId: number,
  treeId: number | undefined,
  trx: TransactionClientContract,
): Promise<SceneObjectDescriptor[]> => {
  let node: null | TreeNode = await TreeNode.findOrFail(nodeId, { client: trx })

  const baseObject = await GameObject.query({ client: trx })
    .where('nodeId', nodeId)
    .whereNull('treeId')
    .firstOrFail()

  const objects: { object: GameObject, rootId: number, baseTreeId?: number }[] = []

  const root = await getRoot(node, trx)

  objects.push({ object: baseObject, rootId: root.id })

  if (treeId !== undefined) {
    const h = await getObjectHierarchy(node, treeId, trx)

    if (h) {
      let baseTreeId: number | undefined

      for (const treeId of h) {
        let object = await GameObject.query({ client: trx })
          .where('nodeId', nodeId)
          .andWhere('treeId', treeId)
          .first()

        if (!object) {
          // An object does not exist so create one.
          object = await createOverrideObject(treeId, nodeId, trx)
        }

        objects.push({ object, rootId: root.id, baseTreeId })

        baseTreeId = treeId
      }
    }
  }

  // type StackEntry = { node: TreeNode, baseObject: GameObject, baseTreeId: number | undefined }
  // let stack: StackEntry[] = [{ node, baseObject, baseTreeId: undefined }]

  // while (stack.length > 0) {
  //   const { node, baseObject } = stack[0]
  //   stack = stack.slice(1)

  //   const root = await getRoot(node, trx)

  //   objects.push({ object: baseObject, rootId: root.id })

  //   // Found the root of the current tree. Determine if the root
  //   // is contained in another tree.
  //   const trees = await TreeNode.query({ client: trx })
  //     .where('rootNodeId', root.id)

  //   for (const tree of trees) {
  //     // Found tree that contains the root
  //     // Ensure that there is an object for the original node at this tree level.
  //     let object = await GameObject.query({ client: trx })
  //       .where('nodeId', nodeId)
  //       .andWhere('treeId', tree.id)
  //       .first()

  //     if (!object) {
  //       // An object does not exist so create one.
  //       object = await createOverrideObject(tree.id, baseObject.nodeId, trx)
  //     }

  //     stack.push({ node: tree, baseObject: object, baseTreeId: baseObject.treeId ?? undefined })
  //   }
  // }

  return objects.map((entry) => ({
    nodeId: entry.object.nodeId,
    treeId: entry.object.treeId ?? undefined,
    object: entry.object.object,
    rootId: entry.rootId,
  }))
}

// export const generateOverrideObjects = async (
// treeId: number, rootNodeId: number, trx: TransactionClientContract,
// ) => {
//   type StackEntry = { node: TreeNode, subtrees: number[] }
//   let stack: StackEntry[] = [{
//     node: await TreeNode.findOrFail(rootNodeId, { client: trx }),
//     subtrees: [],
//   }]

//   while (stack.length > 0) {
//     const { node, subtrees } = stack[0]
//     stack = stack.slice(1)

//     if (node.rootNodeId === null) {
//       const object = await GameObject.findByOrFail('nodeId', node.id, { client: trx })

//       await createOverrideObject(treeId, object.nodeId, trx)

//       const children = await TreeNode.query({ client: trx })
//         .where('parentNodeId', node.id)
//         .andWhereNull('parentWrapperId')

//       stack = stack.concat(children.map((child) => ({ node: child, subtrees })))

//       // Look for any override connections at any of the current subtree levels.
//       for (let i = 0; i < subtrees.length; i += 1) {
//         const children = await TreeNode.query({ client: trx })
//           .where('parentWrapperId', subtrees[i])
//           .where('parentNodeId', node.id)

//         stack = stack.concat(children.map((child) => ({
//           node: child,
//           subtrees: subtrees.slice(0, i),
//         })))
//       }
//     } else {
//       const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

//       stack = stack.concat([{ node: root, subtrees: [...subtrees, node.id] }])
//     }
//   }
// }

export const getTreeDescriptor = async (
  rootNodeId: number,
  trx: TransactionClientContract
): Promise<NodesResponse | undefined> => {
  type StackEntry = {
    node: TreeNode,
    parent?: TreeNodeDescriptor,
    topLevelWrapperId?: number,
    subtrees: TreeNode[],
    wrapper?: TreeNode,
  }

  const start = await TreeNode.findOrFail(rootNodeId, { client: trx })

  let stack: StackEntry[] = [{
    node: start,
    subtrees: [],
  }]

  let root: TreeNodeDescriptor | undefined

  const objects: Map<string, SceneObjectDescriptor> = new Map()
  const trees: Map<number, string> = new Map()

  while (stack.length > 0) {
    const entry = stack[0]
    const { node, parent, topLevelWrapperId, wrapper, subtrees } = entry
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const result: TreeNodeDescriptor = {
        id: node.id,
        name: wrapper?.name ?? node.name,
        wrapperId: wrapper?.id,
        parentWrapperId: (wrapper !== undefined ? wrapper.parentWrapperId : node.parentWrapperId) ?? undefined,
        children: [],
      }

      if (parent === undefined) {
        root = result
      } else {
        parent.children.push(result)
      }

      const objs = await generateOverrideObjects2(node.id, topLevelWrapperId, trx)

      for (const o of objs) {
        objects.set(`${o.nodeId}-${o.treeId}`, o)
      }

      let children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)
        .andWhereNull('parentWrapperId')

      stack = stack.concat(children.map((child) => ({
        node: child,
        parent: result,
        topLevelWrapperId,
        subtrees,
      })))

      // Look for any override connections at any of the current subtree levels.
      for (let i = 0; i < subtrees.length; i += 1) {
        children = await TreeNode.query({ client: trx })
          .where('parentNodeId', node.id)
          .where('parentWrapperId', subtrees[i].id)

        // If the treeId matches the subtreeId then we must be leaving the tree of treeId and
        // it should be set to undefined.
        stack = stack.concat(children.map((child) => ({
          node: child,
          parent: result,
          topLevelWrapperId,
          subtrees,
        })))
      }
    } else {
      // This is a wrapper node.
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack.push({
        node: root,
        parent,
        topLevelWrapperId: topLevelWrapperId ?? node.id,
        subtrees: [...subtrees, node],
        wrapper: node,
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
  const rootNode = await TreeNode.findOrFail(rootNodeId)

  const treeNode = new TreeNode().useTransaction(trx)

  treeNode.fill({
    parentNodeId,
    rootNodeId,
    name: rootNode.name, // Use the name from the root node.
  })

  await treeNode.save()

  // await generateOverrideObjects(treeNode.id, rootNodeId, trx)

  return getTreeDescriptor(treeNode.id, trx)
}
