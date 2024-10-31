import BaseSchema from '@ioc:Adonis/Lucid/Schema'

type TreeNode = {
  id: number,
  parent_node_id: number | null,
  tree_id: number,
  root_node_id: number | null,
}

export default class extends BaseSchema {
  protected tableName = 'tree_nodes'

  public debug = true

  public async up () {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('id').alter({ alterNullable: false, alterType: false })
      table.increments('tree_id', { primaryKey: false })
      table.unique(['id', 'tree_id'])
    })

    this.defer(async (db) => {
      const trx = await db.transaction()

      try {
        const nodes = await trx.from('tree_nodes') as TreeNode[]

        type NodeInfoType = { node: TreeNode, updated: boolean }
        const map: Map<number, NodeInfoType> = new Map()
        const parentMap: Map<number, NodeInfoType[]> = new Map()

        for (const node of nodes) {
          const nodeInfo = { node, updated: false }

          map.set(node.id, nodeInfo)

          if (node.parent_node_id !== null) {
            let children: NodeInfoType[] | undefined = parentMap.get(node.parent_node_id)

            if (children === undefined) {
              children = []
              parentMap.set(node.parent_node_id, children)
            }

            children.push(nodeInfo)
          }
        }

        for (const [, nodeInfo] of Array.from(map)) {
          if (!nodeInfo.updated) {
            // Find the root of the tree that contains the node with id nodeID.
            let root: NodeInfoType | undefined = nodeInfo

            while (root.node.parent_node_id !== null) {
              console.log(root.node.parent_node_id)
              root = map.get(root.node.parent_node_id)

              if (root === undefined) {
                throw new Error('root not set')
              }
            }

            let stack: NodeInfoType[] = [root]

            while (stack.length > 0) {
              const nodeInfo = stack[0]
              stack = stack.slice(1)

              nodeInfo.node.tree_id = root.node.tree_id
              nodeInfo.updated = true

              await trx.from('tree_nodes')
                .where('id', nodeInfo.node.id)
                .update({
                  tree_id: root.node.tree_id,
                })

              await trx.from('scene_objects')
                .where('node_id', nodeInfo.node.id)
                .update({
                  tree_id: root.node.tree_id,
                })

              const children = parentMap.get(nodeInfo.node.id)

              if (children) {
                stack.push(...children)
              }

              if (nodeInfo.node.root_node_id !== null) {
                const modifications = await trx.from('node_modifications').where('modifier_node_id', nodeInfo.node.id)

                for (const modification of modifications) {
                  for (const addedNodeId of modification.added_nodes) {
                    const child = map.get(addedNodeId)

                    if (child) {
                      stack.push(child)
                    }
                  }
                }

                await trx.from('node_modifications')
                  .where('modifier_node_id', nodeInfo.node.id)
                  .update ({
                    tree_id: root.node.tree_id,
                  })
              }
            }
          }
        }

        // for (const [, nodeInfo] of Array.from(map)) {
        //   await trx.from('tree_nodes')
        //     .where('id', nodeInfo.node.id)
        //     .update({
        //       tree_id: nodeInfo.node.tree_id,
        //     })
        // }

        await trx.commit()
      } catch(error) {
        console.log(error)
        await trx.rollback()
      }
    })
  }

  public async down () {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['id', 'tree_id'])
      table.dropColumn('tree_id')
    })
  }
}
