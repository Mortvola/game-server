import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import SceneObject from './SceneObject'
import Component from './Component'
import NodeModification from './NodeModification'

export type SceneObjectDescriptor = {
  nodeId: number,
  object: unknown,
}

type AddedNode = {
  nodeId: number,
  parentNodeId: number,
  pathId: number
}

export type TreeNodeDescriptor2 = {
  id: number,
  rootNodeId?: number,
  modifierNodeId?: number,
  children?: number[],
  addedNodes?: AddedNode[],
  modifications?: NodeModification[],
}

export type ComponentDescriptor = {
  id: number,
  type: string,
  props?: unknown,
}

export type SceneObjectDescriptor2 = {
  nodeId: number,
  name?: string,
  // modifierNodeId?: number,
  // pathId?: number,
  components: number[],
  // modifications: Record<string, unknown>,
}

export type NodesResponse2 = {
  rootNodeId: number,
  nodes: TreeNodeDescriptor2[],
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
  trx: TransactionClientContract
): Promise<NodesResponse2> => {
  type StackEntry = TreeNode

  const start = await TreeNode.findOrFail(rootNodeId, { client: trx })

  let stack: StackEntry[] = [start]

  const nodes: Map<number, TreeNodeDescriptor2> = new Map()
  const objects: Map<number, SceneObjectDescriptor2[]> = new Map()
  const components: Map<number, ComponentDescriptor> = new Map()

  while (stack.length > 0) {
    const node = stack[0]
    stack = stack.slice(1)

    if (node.rootNodeId === null) {
      const children = await TreeNode.query({ client: trx })
        .where('parentNodeId', node.id)

      // Only push onto the stack nodes that we have not yet seen
      for (const child of children) {
        if (!nodes.has(child.id) && !stack.some((n) => n.id === child.id)) {
          stack.push(child)
        }
      }

      if (!nodes.has(node.id)) {
        nodes.set(node.id, {
          id: node.id,
          children: children?.map((child) => child.id),
        })
      }
    } else {
      // This is a modifier node.
      const root = await TreeNode.findOrFail(node.rootNodeId, { client: trx })

      // Only push onto the stack nodes that we have not yet seen
      if (!nodes.has(root.id) && !stack.some((n) => n.id === root.id)) {
        stack.push(root)
      }

      const mods = await NodeModification.query({ client: trx })
        .where('modifierNodeId', node.id)

      const addedNodes = await TreeNode.query({ client: trx })
        .whereIn('id', [...mods.flatMap((mod) => mod.addedNodes)])

      // Only push onto the stack nodes that we have not yet seen
      for (const added of addedNodes) {
        if (!nodes.has(added.id) && !stack.some((n) => n.id === added.id)) {
          stack.push(added)
        }
      }

      if (!nodes.has(node.id)) {
        nodes.set(node.id, {
          id: node.id,
          rootNodeId: node.rootNodeId ?? undefined,
          modifications: mods,
        })
      }
    }
  }

  for (const node of Array.from(nodes.values())) {
    const sceneObjects = await SceneObject.query({ client: trx})
      .where('nodeId', node.id)

    const o: SceneObjectDescriptor2[] = []

    for (const sceneObject of sceneObjects) {
      const descriptor: SceneObjectDescriptor2 = {
        nodeId: sceneObject.nodeId,
        name: sceneObject.name ?? undefined,
        // modifierNodeId: sceneObject.modifierNodeId ?? undefined,
        // pathId: sceneObject.pathId ?? undefined,
        components: [],
        // modifications: sceneObject.modifications,
      }

      for (const compId of sceneObject.components) {
        const component = await Component.find(compId)

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
      parentNodeId,
      rootNodeId,
      // modifierNodeId,
      // path,
      // pathId,
    })

  await root.save()

  return getTreeDescriptor(root.id, trx)
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
