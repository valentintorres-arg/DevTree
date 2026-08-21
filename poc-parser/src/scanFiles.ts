import { Project, SourceFile } from "ts-morph";
import path from "path";

// Carga el tsconfig.json del proyecto target y devuelve sus SourceFile de
// ts-morph. Apoyarse en tsConfigFilePath (en vez de globs manuales) hace que
// ts-morph reutilice la resolucion de include/exclude/paths de TypeScript,
// asi node_modules/dist/build quedan afuera automaticamente si el
// tsconfig del target los excluye (como en sample-project/tsconfig.json).
export function scanFiles(targetTsConfigPath: string): SourceFile[] {
  const project = new Project({
    tsConfigFilePath: path.resolve(targetTsConfigPath),
  });

  return project.getSourceFiles();
}
