import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ExportType } from "./types";
import type { ComponentFlowNode } from "./graphToFlow";
import "./ComponentNode.css";

// Mismo esquema de colores que el artifact de referencia publicado
// (DevTree Component Graph), para que la UI y esa visualizacion de
// mano cuenten la misma historia.
const KIND_COLORS: Record<ExportType, string> = {
  functionDeclaration: "#128577",
  arrowFunction: "#a8690a",
  anonymousDefaultFunction: "#3a6bc2",
  anonymousDefaultArrow: "#b53a70",
  hocWrapped: "#7c3aed",
};

export function ComponentNode({ data }: NodeProps<ComponentFlowNode>) {
  const { label, filePath, exportType } = data;

  return (
    <div className="component-node" title={filePath}>
      <Handle type="target" position={Position.Top} />
      <div className="component-node__name">{label}</div>
      <div className="component-node__kind" style={{ color: KIND_COLORS[exportType] }}>
        {exportType}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
