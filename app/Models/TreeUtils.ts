import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import SceneObject from './SceneObject'
import Component from './Component'
import NodeModification from './NodeModification'
import Scene from './Scene'

type TreeModifierDescriptor = {
  id: number,
  sceneId: number,
  rootNodeId: number,
  rootSceneId: number,
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
  sceneObjectId: number,
  type: string,
  props?: unknown,
}

type SceneObjectDescriptor = {
  id: number,
  name: string,
  components: string[],
}

export type NodesResponse = {
  root: {
    id: number,
    sceneId: number,
  }
  nodes: (TreeNodeDescriptor2 | TreeModifierDescriptor)[],
  objects: SceneObjectDescriptor[],
  components: ComponentDescriptor[],
  modifications?: NodeModification[],
  deletedNodes?: { id: number, sceneId: number}[],
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
  rootSceneId: number,
  trx: TransactionClientContract
): Promise<NodesResponse> => {
  type StackEntry = TreeNode

  const start = await TreeNode.query({ client: trx })
    .where('id', rootNodeId)
    .where('sceneId', rootSceneId)
    .firstOrFail()

  let stack: StackEntry[] = [start]

  const nodes: Map<number, TreeNodeDescriptor2 | TreeModifierDescriptor> = new Map()
  const objects: Map<number, SceneObjectDescriptor[]> = new Map()
  const components: Map<number, ComponentDescriptor> = new Map()

  while (stack.length > 0) {
    const node = stack[0]
    stack = stack.slice(1)

    if (node.rootSceneId === null) {
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
        throw new Error('rootSceneId is not set')
      }

      // This is a modifier node.

      const scene = await Scene.findOrFail(node.rootSceneId, { client: trx })

      const root = await TreeNode.query({ client: trx })
        .where('id', scene.rootNodeId)
        .where('sceneId', scene.id)
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
        rootNodeId: scene.rootNodeId,
        rootSceneId: scene.id,
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

      const o: SceneObjectDescriptor[] = []

      for (const sceneObject of sceneObjects) {
        const descriptor: SceneObjectDescriptor = {
          id: sceneObject.id,
          name: sceneObject.name,
          components: [],
        }

        const objectComponents = await Component.query({ client: trx })
          .where('sceneObjectId', sceneObject.id)

        for (const component of objectComponents) {
          components.set(
            component.id,
            {
              sceneObjectId: sceneObject.id,
              type: component.type,
              props: component.props,
            },
          )

          descriptor.components.push(component.type)
        }

        o.push(descriptor)
      }

      objects.set(node.id, o)
    }
  }

  return {
    root: {
      id: rootNodeId,
      sceneId: rootSceneId,
    },
    nodes: Array.from(nodes.values()),
    objects: Array.from(objects.values()).flatMap((obj) => obj),
    components: Array.from(components.values()),
  }
}

export const createTree = async (
  sceneId: number,
  rootScene: Scene,
  parentDescriptor: ParentDescriptor,
  trx: TransactionClientContract,
) => {
  const root = await new TreeNode()
    .useTransaction(trx)
    .fill({
      id: getUniqueId(),
      sceneId,
      rootSceneId: rootScene.id,
    })
    .save()

  const modification = await setParent(root, parentDescriptor, trx)

  const descriptor = await getTreeDescriptor(root.id, root.sceneId, trx)

  if (modification) {
    descriptor.modifications = [modification]
  }

  return descriptor
}

export const createPrefab = async (
  nodeId: number,
  sceneId: number,
  trx: TransactionClientContract,
) => {
  const deletedNodes: { id: number, sceneId: number }[] = []

  let root = await TreeNode.query({ client: trx })
    .where('id', nodeId)
    .where('sceneId', sceneId)
    .firstOrFail()

  let name: string | null = null

  if (root.sceneObjectId !== null) {
    const object = await SceneObject.find(root.sceneObjectId, { client: trx })

    if (object) {
      name = object.name
    }
  }

  const scene = await new Scene()
    .useTransaction(trx)
    .fill({
      name: name ?? 'Unknown',
    })
    .save()

  await root.merge({
    parentNodeId: null,
  })
    .save()

  const modifierNode = await new TreeNode()
    .useTransaction(trx)
    .fill({
      id: getUniqueId(),
      sceneId,
      rootSceneId: scene.id,
    })
    .save()

  type StackEntry = { node: TreeNode, parentNodeId: number | null }
  let stack: StackEntry[] = [{ node: root, parentNodeId: root.parentNodeId }]

  while (stack.length > 0) {
    const { node, parentNodeId } = stack[0]
    stack = stack.slice(1)

    const children = await TreeNode.query({ client: trx })
      .where('parentNodeId', node.id)
      .where('sceneId', sceneId)

    // Xor the node id with the id of the modifier node so that
    // any modifiers higher in the tree can still be applied.
    const newNodeId = modifierNode.id ^ node.id

    stack.push(...children.map((child) => ({ node: child, parentNodeId: newNodeId })))

    const nodeModifications = await NodeModification.query({ client: trx })
      .where('nodeId', node.id)
      .where('sceneId', node.sceneId)

    for (const mod of nodeModifications) {
      await mod.merge({
        nodeId: newNodeId,
        sceneId: scene.id,
      })
        .save()
    }

    // Since we are changing the primary id of the tree node then
    // we must use the query builder interface instead of the ORM
    // interface.
    await trx.from('tree_nodes')
      .where('id', node.id)
      .where('scene_id', node.sceneId)
      .update({
        id: newNodeId,
        scene_id: scene.id,
        parent_node_id: parentNodeId,
      })

    deletedNodes.push({ id: node.id, sceneId: node.sceneId })

    // Set the values in the ORM model for later use.
    node.id = newNodeId
    node.sceneId = scene.id
    node.parentNodeId = parentNodeId
  }

  await modifierNode.merge({
    rootSceneId: root.sceneId,
  })
    .save()

  await scene.merge({
    rootNodeId: root.id,
  })
    .save()

  return { scene, root: modifierNode, deletedNodes }
}

export type ParentDescriptor = {
  parentNodeId: number | null,
  modifierNodeId: number | null,
  pathId: number | null,
}

export const setParent = async (
  node: TreeNode,
  parentDescriptor: ParentDescriptor,
  trx: TransactionClientContract,
) => {
  node.parentNodeId = parentDescriptor.parentNodeId

  await node.save()

  let modification: NodeModification | null = null

  if (
    parentDescriptor.modifierNodeId !== null
  && parentDescriptor.pathId !== null
  ) {
    if (parentDescriptor.parentNodeId !== null) {
      throw new Error('Ambiguous parent information')
    }

    modification = await NodeModification.query({ client: trx })
      .where('nodeId', parentDescriptor.modifierNodeId)
      .where('sceneId', node.sceneId)
      .where('pathId', parentDescriptor.pathId)
      .first()

    if (modification) {
      modification.merge({
        addedNodes: [
          ...new Set([
            ...modification.addedNodes,
            node.id,
          ]),
        ],
      })
    } else {
      modification = new NodeModification()
        .useTransaction(trx)
        .fill({
          nodeId: parentDescriptor.modifierNodeId,
          sceneId: node.sceneId,
          pathId: parentDescriptor.pathId,
          addedNodes: [node.id],
        })
    }

    await modification.save()
  }

  return modification
}

export const unsetParent = async (
  node: TreeNode,
  parentDescriptor: ParentDescriptor,
  trx: TransactionClientContract,
) => {
  let modification: NodeModification | null = null

  // If there is a modifierNodeId and related properties
  // then the node is being removed from that node modifier
  // as an added node.
  if (
    parentDescriptor.modifierNodeId !== null
          && parentDescriptor.pathId !== null
  ) {
    if (parentDescriptor.parentNodeId !== null) {
      throw new Error('Ambiguous previous parent information')
    }

    modification = await NodeModification.query({ client: trx })
      .where('nodeId', parentDescriptor.modifierNodeId)
      .where('sceneId', node.sceneId)
      .where('pathId', parentDescriptor.pathId)
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

  return modification
}

export const deleteTree = async (
  rootNode: TreeNode,
  trx: TransactionClientContract,
) => {
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
      .where('sceneId', node.sceneId)

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
    if (node.sceneObjectId) {
    // Delete any associated scene objects (there should only be 1)
      const object = await SceneObject.find(node.sceneObjectId, { client: trx })

      if (object) {
        await object.delete()
      }
    }

    const modifications = await NodeModification.query({ client: trx })
      .where('nodeId', node.id)
      .where('sceneId', node.sceneId)

    for (const mod of modifications) {
      await mod.delete()
    }

    await node.delete()
  }
}

export const getUniqueId = (): number => {
  return Math.trunc(Math.random() * 2147483646) + 1
}
