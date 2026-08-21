import { useReactFlow } from "@xyflow/react";
import type { Edge } from "@xyflow/react";
import type { ComponentFlowNode } from "./graphToFlow";
import { NODE_HEIGHT, NODE_WIDTH } from "./layout";
import "./TreeMiniMap.css";

const PANEL_WIDTH = 200;
const PANEL_HEIGHT = 150;
const PADDING = 10;

interface TreeMiniMapProps {
  nodes: ComponentFlowNode[];
  edges: Edge[];
}

// Reemplazo de <MiniMap> de React Flow: esa solo dibuja un rectangulo
// por nodo, nunca las conexiones entre ellos (limitacion del componente,
// no un prop que faltaba activar) — a simple vista se ve como bloques
// sueltos, no como el arbol. Este dibuja tanto los nodos como las
// aristas escaladas al mismo layout de dagre que ya usa el canvas
// principal, para que la miniatura muestre la forma real del arbol.
export function TreeMiniMap({ nodes, edges }: TreeMiniMapProps) {
  const { setCenter } = useReactFlow();

  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const maxX = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH));
  const minY = Math.min(...nodes.map((n) => n.position.y));
  const maxY = Math.max(...nodes.map((n) => n.position.y + NODE_HEIGHT));
  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);

  const scale = Math.min(
    (PANEL_WIDTH - PADDING * 2) / graphWidth,
    (PANEL_HEIGHT - PADDING * 2) / graphHeight,
  );

  const toSvg = (flowX: number, flowY: number) => ({
    x: (flowX - minX) * scale + PADDING,
    y: (flowY - minY) * scale + PADDING,
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      width={PANEL_WIDTH}
      height={PANEL_HEIGHT}
      viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`}
      className="tree-minimap"
      role="img"
      aria-label="Vista miniatura del arbol de componentes, con sus conexiones"
    >
      {edges.map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        if (!source || !target) return null;
        const from = toSvg(source.position.x + NODE_WIDTH / 2, source.position.y + NODE_HEIGHT);
        const to = toSvg(target.position.x + NODE_WIDTH / 2, target.position.y);
        return (
          <line
            key={edge.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="tree-minimap__edge"
          />
        );
      })}
      {nodes.map((node) => {
        const topLeft = toSvg(node.position.x, node.position.y);
        return (
          <rect
            key={node.id}
            x={topLeft.x}
            y={topLeft.y}
            width={Math.max(NODE_WIDTH * scale, 2)}
            height={Math.max(NODE_HEIGHT * scale, 2)}
            rx={1.5}
            className="tree-minimap__node"
            onClick={() =>
              setCenter(node.position.x + NODE_WIDTH / 2, node.position.y + NODE_HEIGHT / 2, {
                zoom: 1,
                duration: 300,
              })
            }
          >
            <title>{node.data.label}</title>
          </rect>
        );
      })}
    </svg>
  );
}
