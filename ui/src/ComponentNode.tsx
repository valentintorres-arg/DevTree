import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ComponentFlowNode } from "./graphToFlow";
import { EXPORT_TYPE_COLORS } from "./exportTypeColors";
import "./ComponentNode.css";

export function ComponentNode({ data }: NodeProps<ComponentFlowNode>) {
  const { label, filePath, exportType } = data;

  return (
    <div className="component-node" title={filePath}>
      <Handle type="target" position={Position.Top} />
      <div className="component-node__name">{label}</div>
      <div className="component-node__kind" style={{ color: EXPORT_TYPE_COLORS[exportType] }}>
        {exportType}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
