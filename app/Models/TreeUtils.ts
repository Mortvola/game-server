import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import SceneObject from './SceneObject'

export type TreeNodeDescriptor = {
  id: number,
  name?: string,
  wrapperId?: number,
  modifierNodeId?: number,
  pathId?: number,
  path?: number[],
  // connectionOverride?: boolean,
  children: TreeNodeDescriptor[],
}

export type SceneObjectDescriptor = {
  nodeId: number,
  treeId?: number,

  object: unknown,
}

export type NodesResponse = {
  root: TreeNodeDescriptor,
  objects: SceneObjectDescriptor[],
  trees: { id: number, name: string }[],
}

type AddedNode = {
  nodeId: number,
  parentNodeId: number,
  pathId: number
}

export type TreeNodeDescriptor2 = {
  id: number,
  parentNodeId?: number,
  rootNodeId?: number,
  modifierNodeId?: number,
  children?: number[],
  addedNodes?: AddedNode[],
}

export type NodesResponse2 = {
  rootNodeId: number,
  nodes: TreeNodeDescriptor2[],
  objects: SceneObject[],
}

export const createOverrideObject = async (
  modifierNodeId: number,
  nodeId: number,
  trx: TransactionClientContract,
) => {
  const overrideObject = new SceneObject().useTransaction(trx)

  overrideObject.fill({
    nodeId,
    modifierNodeId,
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

    if (child.modifierNodeId !== null) {
      parentNode = await TreeNode.findOrFail(child.modifierNodeId, { client: trx })
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
    if (root.modifierNodeId !== null) {
      root = await TreeNode.findOrFail(root.modifierNodeId, { client: trx })
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

  const baseObject = await SceneObject.query({ client: trx })
    .where('nodeId', nodeId)
    .whereNull('modifiderNodeId')
    .firstOrFail()

  const objects: { object: SceneObject, rootId: number, baseTreeId?: number }[] = []

  const root = await getRoot(node, trx)

  objects.push({ object: baseObject, rootId: root.id })

  if (treeId !== undefined) {
    const h = await getObjectHierarchy(node, treeId, trx)

    if (h) {
      let baseTreeId: number | undefined

      for (const modifierNodeId of h) {
        let object = await SceneObject.query({ client: trx })
          .where('nodeId', nodeId)
          .andWhere('modifierNodeId', modifierNodeId)
          .first()

        if (!object) {
          // An object does not exist so create one.
          object = await createOverrideObject(modifierNodeId, nodeId, trx)
        }

        objects.push({ object, rootId: root.id, baseTreeId })

        baseTreeId = modifierNodeId
      }
    }
  }

  // type StackEntry = { node: TreeNode, baseObject: SceneObject, baseTreeId: number | undefined }
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
  //     let object = await SceneObject.query({ client: trx })
  //       .where('nodeId', nodeId)
  //       .andWhere('modifierNodeId', tree.id)
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
    treeId: entry.object.modifierNodeId ?? undefined,
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
//       const object = await SceneObject.findByOrFail('nodeId', node.id, { client: trx })

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

// export const getTreeDescriptor = async (
//   rootNodeId: number,
//   trx: TransactionClientContract
// ): Promise<NodesResponse | undefined> => {
//   type StackEntry = {
//     node: TreeNode,
//     parent?: TreeNodeDescriptor,
//     topLevelWrapperId?: number,
//     subtrees: TreeNode[],
//     wrapper?: TreeNode,
//   }

//   const start = await TreeNode.findOrFail(rootNodeId, { client: trx })

//   let stack: StackEntry[] = [{
//     node: start,
//     subtrees: [],
//   }]

//   let root: TreeNodeDescriptor | undefined

//   const objects: Map<string, SceneObjectDescriptor> = new Map()
//   const trees: Map<number, string> = new Map()

//   while (stack.length > 0) {
//     const entry = stack[0]
//     const { node, parent, topLevelWrapperId, wrapper, subtrees } = entry
//     stack = stack.slice(1)

//     if (node.rootNodeId === null) {
//       const result: TreeNodeDescriptor = {
//         id: node.id,
//         name: wrapper?.name ?? node.name,
//         wrapperId: wrapper?.id,
//         modifierNodeId: (wrapper !== undefined ? wrapper.modifierNodeId : node.modifierNodeId) ?? undefined,
//         pathId: node.pathId ?? undefined,
//         path: node.path ?? undefined,
//         children: [],
//       }

//       if (parent === undefined) {
//         root = result
//       } else {
//         parent.children.push(result)
//       }

//       const objs = await generateOverrideObjects2(node.id, topLevelWrapperId, trx)

//       for (const o of objs) {
//         objects.set(`${o.nodeId}-${o.treeId}`, o)
//       }

//       let children = await TreeNode.query({ client: trx })
//         .where('parentNodeId', node.id)
//         .andWhereNull('modifierNodeId')

//       stack = stack.concat(children.map((child) => ({
//         node: child,
//         parent: result,
//         topLevelWrapperId,
//         subtrees,
//       })))

//       // Look for any override connections at any of the current subtree levels.
//       for (let i = 0; i < subtrees.length; i += 1) {
//         children = await TreeNode.query({ client: trx })
//           .where('parentNodeId', node.id)
//           .where('modifierNodeId', subtrees[i].id)

//         for (const child of children) {
//           // Only inlcude the node if the pathId matches
//           let pathId = 0
//           for (let p = subtrees.length - 1; p >= 0; p -= 1) {
//             if (subtrees[p].id === child.modifierNodeId) {
//               break
//             }

//             pathId ^= subtrees[p].id
//           }

//           if (child.pathId === pathId) {
//             stack.push({
//               node: child,
//               parent: result,
//               topLevelWrapperId,
//               subtrees,
//             })
//           }
//         }
//       }
//     } else {
//       // This is a wrapper node.
//       const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

//       stack.push({
//         node: root,
//         parent,
//         topLevelWrapperId: topLevelWrapperId ?? node.id,
//         subtrees: [...subtrees, node],
//         wrapper: node,
//       })

//       trees.set(root.id, root.name)
//     }
//   }

//   if (root) {
//     return {
//       root,
//       objects: Array.from(objects).map(([, o]) => o),
//       trees: Array.from(trees).map(([id, name]) => ({ id, name })),
//     }
//   }
// }

export const getTreeDescriptor = async (
  rootNodeId: number,
  trx: TransactionClientContract
): Promise<NodesResponse2> => {
  type StackEntry = TreeNode

  const start = await TreeNode.findOrFail(rootNodeId, { client: trx })

  let stack: StackEntry[] = [start]

  const nodes: Map<number, { node: TreeNode, children?: number[]; addedNodes?: AddedNode[] }> = new Map()
  const objects: Map<number, SceneObject[]> = new Map()

  while (stack.length > 0) {
    const node = stack[0]
    stack = stack.slice(1)

    let children: TreeNode[] | undefined
    let addedNodes: TreeNode[] | undefined

    if (node.rootNodeId === null) {
      children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)
        .andWhereNull('modifierNodeId')

      stack.push(...children)
    } else {
      // This is a wrapper node.
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      stack.push(root)

      addedNodes = await TreeNode.query({ client: trx })
        .andWhere('modifierNodeId', node.id)

      stack.push(...addedNodes)
    }

    if (!nodes.has(node.id)) {
      nodes.set(node.id, {
        node,
        children: children?.map((child) => child.id),
        addedNodes: addedNodes?.map((addedNode) => ({
          nodeId: addedNode.id,
          parentNodeId: addedNode.parentNodeId ?? 0,
          pathId: addedNode.pathId ?? 0,
        })),
      })

      const nodeObjects = await SceneObject.query({ client: trx})
        .where('nodeId', node.id)

      objects.set(node.id, nodeObjects)
    }
  }

  return {
    rootNodeId,
    nodes: Array.from(nodes.values()).map((node) => ({
      id: node.node.id,
      parentNodeId: node.node.parentNodeId ?? undefined,
      rootNodeId: node.node.rootNodeId ?? undefined,
      modifierNodeId: node.node.modifierNodeId ?? undefined,
      children: node.children,
      addedNodes: node.addedNodes,
    })),
    objects: Array.from(objects.values()).flatMap((obj) => obj),
  }
}

export const createTree = async (
  rootNodeId: number,
  parentNodeId: number | null,
  modifierNodeId: number | undefined,
  path: number[] | undefined,
  pathId: number | undefined,
  trx: TransactionClientContract,
) => {
  const rootNode = await TreeNode.findOrFail(rootNodeId, { client: trx })

  const sceneObject = await SceneObject.query({ client: trx })
    .where('nodeId', rootNode.id)
    .whereNull('modifierNodeId')
    .firstOrFail()

  const root = new TreeNode()
    .useTransaction(trx)
    .fill({
      parentNodeId,
      name: sceneObject.name ?? 'Unknown', // Use the name from the scene object of the root node.
      rootNodeId,
      modifierNodeId,
      path,
      pathId,
    })

  await root.save()

  return getTreeDescriptor(root.id, trx)
}

// export const getPathId = async (startId: number, wrapperId: number, trx: TransactionClientContract) => {
//   // let id = 0
//   // const path: number[] = []

//   type StackEntry = {
//     nodeId: number,
//     id: number,
//     path: number[]
//   }

//   let stack: StackEntry[] = [{ nodeId: startId, id: 0, path: [] }]

//   while (stack.length > 0) {
//     let { nodeId, id, path } = stack[0]
//     stack = stack.slice(1)

//     const node = await TreeNode.findOrFail(nodeId, { client: trx })

//     if (node.rootNodeId !== null) {
//       if (node.id === wrapperId) {
//         return { id, path }
//       }

//       if (node.parentNodeId !== null) {
//         stack.push({ nodeId: node.parentNodeId, id: id ^ node.id, path: [...path, node.id] })
//       }
//     } else if (node.parentNodeId !== null) {
//       stack.push({ nodeId: node.parentNodeId, id, path })
//     } else {
//       const wrappers = await TreeNode.query({ client: trx })
//         .where('rootNodeId', node.id)

//       stack.push(...wrappers.map((wrapper) => ({
//         nodeId: wrapper.id,
//         id,
//         path,
//       })))
//     }
//   }

//   return { id: 0, path: [] }
// }
