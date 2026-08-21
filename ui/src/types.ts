// Espeja poc-parser/src/detectComponents.ts (ComponentExportType) y
// poc-parser/src/buildGraph.ts (GraphComponent/ComponentGraph). No hay
// paquete compartido entre poc-parser y ui todavia (dos proyectos
// independientes, ver UI_PLAN.md), asi que se duplica el tipo a mano.
export type ExportType =
  | "functionDeclaration"
  | "arrowFunction"
  | "anonymousDefaultFunction"
  | "anonymousDefaultArrow"
  | "hocWrapped";

export interface GraphComponent {
  id: string;
  filePath: string;
  exportType: ExportType;
  dependencies: string[];
}

export interface ComponentGraph {
  components: GraphComponent[];
}
