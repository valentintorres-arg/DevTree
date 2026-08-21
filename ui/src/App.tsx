import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ReactFlowTheme.css";
import { ComponentNode } from "./ComponentNode";
import { graphToFlow, type ComponentFlowNode } from "./graphToFlow";
import { layoutWithDagre } from "./layout";
import type { ComponentGraph } from "./types";

const nodeTypes = { componentNode: ComponentNode };

// Carga /graph.json (copia estatica de poc-parser/output/graph.json,
// ver UI_PLAN.md Paso UI-4) y lo renderiza como un grafo interactivo:
// pan/zoom/minimap de React Flow, posiciones calculadas por dagre.
export function App() {
  const [graph, setGraph] = useState<ComponentGraph | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/graph.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ComponentGraph>;
      })
      .then(setGraph)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const { nodes, edges } = useMemo<{ nodes: ComponentFlowNode[]; edges: Edge[] }>(() => {
    if (!graph) return { nodes: [], edges: [] };
    const flow = graphToFlow(graph);
    return { nodes: layoutWithDagre(flow.nodes, flow.edges), edges: flow.edges };
  }, [graph]);

  if (error) {
    return (
      <div style={{ padding: "2rem", fontFamily: "monospace" }}>
        No se pudo cargar /graph.json: {error}
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export default App;
