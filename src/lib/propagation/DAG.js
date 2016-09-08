import * as nodeFns from './nodeFns'
import {SimulationNode} from './node'

import * as _collections from 'gEngine/collections'

function extractNextLevelAndErrorNodesAndMutate(unprocessedNodes, heightOrderedNodes, errorNodes, graphErrorNodes, nodesById) {
  const nextLevelNodes = _.remove(
    unprocessedNodes,
    n => nodeFns.allInputsWithin(heightOrderedNodes)(n) && _.isEmpty(n.errors) && !nodeFns.anyInputsWithin(errorNodes)(n)
  )
  heightOrderedNodes.push(...nextLevelNodes)

  const incomingErrorNodes = _.remove(unprocessedNodes, n => !_.isEmpty(n.errors) && nodeFns.allInputsWithin(heightOrderedNodes)(n))
  errorNodes.push(...incomingErrorNodes)
  heightOrderedNodes.push(...incomingErrorNodes) // We may want to resimulate these later anyways...

  const infiniteLoopNodes = _.remove(unprocessedNodes, n => _.some(nodesById[n.id].lastAncestors, id => id === n.id))
  const withInfiniteLoopErrors = infiniteLoopNodes.map(nodeFns.withInfiniteLoopError)
  errorNodes.push(...withInfiniteLoopErrors)
  graphErrorNodes.push(...withInfiniteLoopErrors)

  const inputErrorNodes = _.remove(
    unprocessedNodes,
    _collections.andFns(nodeFns.anyInputsWithin(errorNodes), nodeFns.allInputsWithin([...heightOrderedNodes, ...errorNodes]))
  )
  const withAncestralErrors = inputErrorNodes.map(nodeFns.withAncestralError(errorNodes))
  errorNodes.push(...withAncestralErrors)
  graphErrorNodes.push(...withAncestralErrors)
}

function orderNodesAndAddData(nodes) {
  let unprocessedNodes = nodes.map(nodeFns.extractInputs)

  let nodesById = _.transform(
    unprocessedNodes,
    (resultMap, node) => {resultMap[node.id] = {node, lastAncestors: node.inputs, ancestors: node.inputs}},
    {}
  )

  const missingInputsNodes = _.remove(unprocessedNodes, nodeFns.hasMissingInputs(unprocessedNodes))
  let graphErrorNodes = missingInputsNodes.map(nodeFns.withMissingInputError(nodes))

  const duplicateIdNodes = _.remove(unprocessedNodes, nodeFns.hasDuplicateId(unprocessedNodes))
  graphErrorNodes.push(...duplicateIdNodes.map(nodeFns.withDuplicateIdError))

  let errorNodes = Object.assign([], graphErrorNodes)
  let heightOrderedNodes = []

  while (!_.isEmpty(unprocessedNodes)) {
    extractNextLevelAndErrorNodesAndMutate(unprocessedNodes, heightOrderedNodes, errorNodes, graphErrorNodes, nodesById)

    unprocessedNodes.forEach(n => {
      const newLastAncestors = _.uniq(_.flatten(nodesById[n.id].lastAncestors.map(a => nodesById[a].node.inputs)))

      nodesById[n.id].lastAncestors = newLastAncestors
      nodesById[n.id].ancestors = _.uniq([...nodesById[n.id].ancestors, ...newLastAncestors])
    })
  }

  return {
    orderedNodeStructs: heightOrderedNodes.map(nodeFns.withRelatives(heightOrderedNodes, nodesById)),
    graphErrorNodes,
  }
}

export class SimulationDAG {
  constructor(nodes) {
    if (!!_.get(window, 'recorder')) { window.recorder.recordSimulationDAGConstructionStart(this) }

    const {orderedNodeStructs, graphErrorNodes} = orderNodesAndAddData(nodes)

    const asNodes = orderedNodeStructs.map((n,i) => new SimulationNode(n, this, i))

    this.nodes = asNodes
    this.graphErrorNodes = graphErrorNodes

    if (!!_.get(window, 'recorder')) { window.recorder.recordSimulationDAGConstructionStop(this) }
  }

  find(id) { return _collections.get(this.nodes, id) }
  subsetFrom(idSet) { return this.nodes.filter(n => idSet.includes(n.id) || _.some(idSet, id => n.ancestors.includes(id))) }
  strictSubsetFrom(idSet) { return this.nodes.filter(n => _.some(idSet, id => n.ancestors.includes(id))) }
}
