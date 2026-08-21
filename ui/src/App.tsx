import { useCallback, useEffect, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./ReactFlowTheme.css";
import { ComponentNode } from "./ComponentNode";
import { graphToFlow, type ComponentFlowNode } from "./graphToFlow";
import { layoutWithDagre } from "./layout";
import { connectComponents, createComponent, disconnectComponents } from "./api";
import type { ComponentGraph } from "./types";

const nodeTypes = { componentNode: ComponentNode };

// Carga /graph.json (copia estatica de poc-parser/output/graph.json,
// ver UI_PLAN.md Paso UI-4) y lo renderiza como un grafo interactivo:
// pan/zoom/minimap de React Flow, posiciones calculadas por dagre.
//
// Fase 2 (UI_PLAN.md): "+ Nuevo componente" y conectar dos nodos
// arrastrando de un handle a otro escriben archivos reales en el
// proyecto target (via vite-plugin-graph-editor.ts) — no son solo
// cambios visuales. El estado de nodes/edges pasa a ser mutable
// (useNodesState/useEdgesState) en vez de derivarse una sola vez.
export function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ComponentFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  useEffect(() => {
    fetch("/graph.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ComponentGraph>;
      })
      .then((graph) => {
        const flow = graphToFlow(graph);
        setNodes(layoutWithDagre(flow.nodes, flow.edges));
        setEdges(flow.edges);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err));
      });
  }, [setNodes, setEdges]);

  const handleAddComponent = useCallback(async () => {
    const name = window.prompt("Nombre del componente (PascalCase, ej. MyWidget):");
    if (!name) return;

    setActionError(null);
    try {
      const created = await createComponent(name);
      const newNode: ComponentFlowNode = {
        id: created.id,
        type: "componentNode",
        position: { x: 0, y: 0 },
        width: 180,
        height: 56,
        data: { label: created.id, filePath: created.filePath, exportType: "functionDeclaration" },
      };
      setNodes((current) => layoutWithDagre([...current, newNode], edges));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [edges, setNodes]);

  const handleConnect = useCallback(
    async (connection: Connection) => {
      const fromNode = nodes.find((n) => n.id === connection.source);
      const toNode = nodes.find((n) => n.id === connection.target);
      if (!fromNode || !toNode) return;

      setActionError(null);
      try {
        await connectComponents({
          fromFilePath: fromNode.data.filePath,
          toFilePath: toNode.data.filePath,
          toName: toNode.data.label,
        });
        setEdges((current) => addEdge(connection, current));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [nodes, setEdges],
  );

  const handleSelectionChange = useCallback(({ edges: selected }: OnSelectionChangeParams) => {
    setSelectedEdge(selected[0] ?? null);
  }, []);

  const handleDeleteSelectedEdge = useCallback(async () => {
    if (!selectedEdge) return;
    const fromNode = nodes.find((n) => n.id === selectedEdge.source);
    const toNode = nodes.find((n) => n.id === selectedEdge.target);
    if (!fromNode || !toNode) return;

    setActionError(null);
    try {
      await disconnectComponents({
        fromFilePath: fromNode.data.filePath,
        toFilePath: toNode.data.filePath,
        toName: toNode.data.label,
      });
      setEdges((current) => current.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [selectedEdge, nodes, setEdges]);

  if (loadError) {
    return (
      <div style={{ padding: "2rem", fontFamily: "monospace" }}>
        No se pudo cargar /graph.json: {loadError}
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        defaultEdgeOptions={{ interactionWidth: 32 }}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable nodeColor="#8688f0" maskColor="rgba(134, 136, 240, 0.12)" />
        <Panel position="top-left" className="editor-panel">
          <button type="button" onClick={handleAddComponent} className="add-component-button">
            + Nuevo componente
          </button>
          {selectedEdge && (
            <button type="button" onClick={handleDeleteSelectedEdge} className="delete-edge-button">
              🗑 Eliminar {selectedEdge.source} → {selectedEdge.target}
            </button>
          )}
          {actionError && <div className="action-error">{actionError}</div>}
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default App;
