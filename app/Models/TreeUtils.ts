import { TransactionClientContract } from '@ioc:Adonis/Lucid/Database'
import TreeNode from './TreeNode'
import SceneObject from './SceneObject'

export type SceneObjectDescriptor = {
  nodeId: number,
  treeId?: number,

  object: unknown,
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
  const root = new TreeNode()
    .useTransaction(trx)
    .fill({
      parentNodeId,
      rootNodeId,
      modifierNodeId,
      path,
      pathId,
    })

  await root.save()

  return getTreeDescriptor(root.id, trx)
}
