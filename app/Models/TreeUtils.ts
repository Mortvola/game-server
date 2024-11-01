import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import SceneObject from './SceneObject'
import Component from './Component'
import NodeModification from './NodeModification'

type TreeModifierDescriptor = {
  id: number,
  sceneId: number,
  rootNodeId: number,
  rootTreeId: number,
  modifications?: NodeModification[],
}

type TreeNodeDescriptor2 = {
  id: number,
  sceneId: number,
  sceneObjectId: number,
  children?: number[],
}

const isTreeNodeDescriptor = (r: unknown): r is TreeNodeDescriptor2 => (
  (r as TreeNodeDescriptor2)?.sceneObjectId !== undefined
)

type ComponentDescriptor = {
  id: number,
  type: string,
  props?: unknown,
}

type SceneObjectDescriptor2 = {
  id: number,
  name: string,
  components: number[],
}

export type NodesResponse2 = {
  rootNodeId: number,
  nodes: (TreeNodeDescriptor2 | TreeModifierDescriptor)[],
  objects: SceneObjectDescriptor2[],
  components: ComponentDescriptor[],
}

export const cyclicCheck = async (node: TreeNode, trx: TransactionClientContract) => {
  // let child: TreeNode | null = node

  // while (child) {
  //   let parentNode: TreeNode | null = null

  //   if (child.modifierNodeId !== null) {
  //     parentNode = await TreeNode.findOrFail(child.modifierNodeId, { client: trx })
  //   }

  //   if (child.parentNodeId !== null) {
  //     parentNode = await TreeNode.findOrFail(child.parentNodeId, { client: trx })
  //   }

  //   if (parentNode?.id === node.id) {
  //     return true
  //   }

  //   child = parentNode
  // }

  return false
}

export const getTreeDescriptor = async (
  rootNodeId: number,
  rootTreeId: number,
  trx: TransactionClientContract
): Promise<NodesResponse2> => {
  type StackEntry = TreeNode

  const start = await TreeNode.query({ client: trx })
    .where('id', rootNodeId)
    .where('sceneId', rootTreeId)
    .firstOrFail()

  let stack: StackEntry[] = [start]

  const nodes: Map<number, TreeNodeDescriptor2 | TreeModifierDescriptor> = new Map()
  const objects: Map<number, SceneObjectDescriptor2[]> = new Map()
  const components: Map<number, ComponentDescriptor> = new Map()

  while (stack.length > 0) {
    const node = stack[0]
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)
        .where('sceneId', node.sceneId)

      // Only push onto the stack nodes that we have not yet seen
      for (const child of children) {
        if (!nodes.has(child.id) && !stack.some((n) => n.id === child.id)) {
          stack.push(child)
        }
      }

      if (node.sceneObjectId === null) {
        throw new Error('sceneObjectId is null')
      }

      const descriptor: TreeNodeDescriptor2 = {
        id: node.id,
        sceneId: node.sceneId,
        sceneObjectId: node.sceneObjectId,
        children: children?.map((child) => child.id),
      }

      if (!nodes.has(node.id)) {
        nodes.set(node.id, descriptor)
      }
    } else {
      if (node.rootSceneId === null) {
        throw new Error('rootTreeId is not set')
      }

      // This is a modifier node.
      const root = await TreeNode.query({ client: trx })
        .where('id', node.rootNodeId)
        .where('sceneId', node.rootSceneId)
        .firstOrFail()

      // Only push onto the stack nodes that we have not yet seen
      if (!nodes.has(root.id) && !stack.some((n) => n.id === root.id)) {
        stack.push(root)
      }

      const mods = await NodeModification.query({ client: trx })
        .where('nodeId', node.id)
        .where('sceneId', node.sceneId)

      const addedNodes = await TreeNode.query({ client: trx })
        .whereIn('id', [...mods.flatMap((mod) => mod.addedNodes)])
        .where('sceneId', node.sceneId)

      // Only push onto the stack nodes that we have not yet seen
      for (const added of addedNodes) {
        if (!nodes.has(added.id) && !stack.some((n) => n.id === added.id)) {
          stack.push(added)
        }
      }

      const descriptor: TreeModifierDescriptor = {
        id: node.id,
        sceneId: node.sceneId,
        rootNodeId: node.rootNodeId ?? undefined,
        rootTreeId: node.rootSceneId ?? undefined,
        modifications: mods,
      }

      if (!nodes.has(node.id)) {
        nodes.set(node.id, descriptor)
      }
    }
  }

  for (const node of Array.from(nodes.values())) {
    if (isTreeNodeDescriptor(node) && node.sceneObjectId !== null) {
      const sceneObjects = await SceneObject.query({ client: trx})
        .where('id', node.sceneObjectId)

      const o: SceneObjectDescriptor2[] = []

      for (const sceneObject of sceneObjects) {
        const descriptor: SceneObjectDescriptor2 = {
          id: sceneObject.id,
          name: sceneObject.name,
          components: [],
        }

        for (const compId of sceneObject.components) {
          const component = await Component.find(compId, { client: trx })

          if (component) {
            components.set(
              component.id,
              {
                id: component.id,
                type: component.type,
                props: component.props,
              },
            )

            descriptor.components.push(component.id)
          }
        }

        o.push(descriptor)
      }

      objects.set(node.id, o)
    }
  }

  return {
    rootNodeId,
    nodes: Array.from(nodes.values()),
    objects: Array.from(objects.values()).flatMap((obj) => obj),
    components: Array.from(components.values()),
  }
}

export const createTree = async (
  rootNodeId: number,
  parentNodeId: number | null,
  // modifierNodeId: number | undefined,
  // path: number[] | undefined,
  // pathId: number | undefined,
  trx: TransactionClientContract,
) => {
  const root = new TreeNode()
    .useTransaction(trx)
    .fill({
      id: await getUniqueId(),
      parentNodeId,
      rootNodeId,
      // modifierNodeId,
      // path,
      // pathId,
    })

  await root.save()

  return getTreeDescriptor(root.id, root.sceneId, trx)
}

export const deleteTree = async (rootNode: TreeNode, trx: TransactionClientContract) => {
  let stack: TreeNode[] = [rootNode]

  const nodes: Map<number, TreeNode> = new Map()

  // Put all nodes into a map and only
  // push nodes onto the stack that are not
  // in the map to prevent cyclic issues.
  while (stack.length > 0) {
    const node = stack[0]
    stack = stack.slice(1)

    nodes.set(node.id, node)

    // Only delete nodes that are not connected
    // through a modification.
    // Also, don't delete the root node of modifier nodes.
    const children = await TreeNode.query({ client: trx })
      .where('parentNodeId', node.id)

    // Only push children onto the stack if they are
    // not in the map and not already on the stack
    for (const child of children) {
      if (!nodes.has(child.id) && !stack.some((n) => n.id === child.id)) {
        stack.push(child)
      }
    }
  }

  // Iterate through the map and delete the nodes
  // and associated data.
  for (const [, node] of Array.from(nodes)) {
    // Delete any associated scene objects (there should only be 1)
    const objects = await SceneObject.query({ client: trx })
      .where('nodeId', node.id)

    if (objects.length > 1) {
      console.log(`Warning: ${objects.length} base scene objects found for node: ${node.id} `)
    }

    for (const object of objects) {
      await object.delete()
    }

    await node.delete()
  }
}

export const getUniqueId = async (nodeId: number | null = null): Promise<number> => {
  let uniqueId = Math.trunc(Math.random() * 2147483647)

  // if (nodeId !== null) {
  //   // Find the root of the tree that contains the node with id nodeID.
  //   let root = await TreeNode.findOrFail(nodeId)

  //   while (root.parentNodeId !== null) {
  //     root = await TreeNode.findOrFail(root.parentNodeId)
  //   }

  //   let stack: TreeNode[] = [root]
  //   const idSet: Set<number> = new Set()

  //   while (stack.length > 0) {
  //     const node = stack[0]
  //     stack = stack.slice(1)

  //     if (node.id === uniqueId) {
  //       // The unique ID conflicts with the current node.
  //       // Generate a new ID until we find one that is not
  //       // found in the set
  //       do {
  //         uniqueId = Math.trunc(Math.random() * 4294967295)
  //       } while (idSet.has(uniqueId) || node.id === uniqueId)
  //     }

  //     idSet.add(node.id)

  //     const children = await TreeNode.query().where('parentNodeId', node.id)

  //     stack.push(...children)
  //   }
  // }

  return uniqueId
}
