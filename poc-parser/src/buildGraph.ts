import path from "path";
import { ComponentExportType, DetectedComponent } from "./detectComponents";

export interface GraphComponent {
  id: string;
  filePath: string;
  exportType: ComponentExportType;
  dependencies: string[];
}

export interface ComponentGraph {
  components: GraphComponent[];
}

export interface ComponentWithDependencies {
  component: DetectedComponent;
  dependencies: string[];
}

// Ruta relativa a la raiz del proyecto target, con separadores "/" sin
// importar el SO, para que el graph.json sea portable entre maquinas.
function toPortableRelativePath(projectRoot: string, filePath: string): string {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

// Combina componentes (Paso 2) y sus dependencias locales resueltas
// (Paso 3) en la estructura final { components: [{ id, filePath,
// exportType, dependencies }] } descripta en PLAN.md. exportType se
// expone en el grafo (no solo en el log de index.ts) porque la UI
// (ver UI_PLAN.md, Paso UI-3) lo necesita para colorear cada nodo
// segun como se detecto el componente.
export function buildGraph(
  entries: ComponentWithDependencies[],
  projectRoot: string,
): ComponentGraph {
  return {
    components: entries.map(({ component, dependencies }) => ({
      id: component.name,
      filePath: toPortableRelativePath(projectRoot, component.filePath),
      exportType: component.exportType,
      dependencies,
    })),
  };
}
