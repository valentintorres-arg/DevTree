import path from "path";
import { DetectedComponent } from "./detectComponents";

export interface GraphComponent {
  id: string;
  filePath: string;
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
// dependencies }] } descripta en PLAN.md.
export function buildGraph(
  entries: ComponentWithDependencies[],
  projectRoot: string,
): ComponentGraph {
  return {
    components: entries.map(({ component, dependencies }) => ({
      id: component.name,
      filePath: toPortableRelativePath(projectRoot, component.filePath),
      dependencies,
    })),
  };
}
