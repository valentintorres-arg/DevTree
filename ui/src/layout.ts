import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 56;

// React Flow no posiciona nodos por si solo; dagre arma un layout
// top-down a partir de las mismas aristas de dependencia (Paso UI-2).
export function layoutWithDagre<T extends Node>(nodes: T[], edges: Edge[]): T[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 80 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    // dagre da el centro del nodo; React Flow posiciona por la
    // esquina superior izquierda.
    return {
      ...node,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    };
  });
}
