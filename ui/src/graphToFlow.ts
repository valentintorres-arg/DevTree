import type { Edge, Node } from "@xyflow/react";
import type { ComponentGraph, ExportType } from "./types";
import { NODE_HEIGHT, NODE_WIDTH } from "./layout";

export interface ComponentNodeData extends Record<string, unknown> {
  label: string;
  filePath: string;
  exportType: ExportType;
}

export type ComponentFlowNode = Node<ComponentNodeData, "componentNode">;

// Convierte { components: [{ id, filePath, exportType, dependencies }] }
// (la forma de graph.json, ver PLAN.md Paso 4) a nodes/edges de React
// Flow. Las posiciones se dejan en (0, 0): layoutWithDagre las calcula
// despues (Paso UI-2).
export function graphToFlow(graph: ComponentGraph): { nodes: ComponentFlowNode[]; edges: Edge[] } {
  const nodes: ComponentFlowNode[] = graph.components.map((component) => ({
    id: component.id,
    type: "componentNode",
    position: { x: 0, y: 0 },
    // Hint explicito de tamano: dagre lo necesita para el layout
    // (ver layout.ts) y el MiniMap lo usa para dibujar cada nodo antes
    // de que el ResizeObserver interno termine de medir el DOM real.
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    data: {
      label: component.id,
      filePath: component.filePath,
      exportType: component.exportType,
    },
  }));

  const edges: Edge[] = graph.components.flatMap((component) =>
    component.dependencies.map((dependencyId) => ({
      id: `${component.id}->${dependencyId}`,
      source: component.id,
      target: dependencyId,
    })),
  );

  return { nodes, edges };
}
