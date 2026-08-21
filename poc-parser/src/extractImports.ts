import { SourceFile } from "ts-morph";
import { DetectedComponent } from "./detectComponents";

// Resuelve, via el modulo de TypeScript (no con regex), los imports de
// `sourceFile` que apuntan a otro archivo del propio proyecto. Un import
// que no resuelve (undefined) o que resuelve dentro de node_modules es una
// libreria externa (ej. "react") y se descarta.
function getLocalImportedFiles(sourceFile: SourceFile): SourceFile[] {
  const localFiles: SourceFile[] = [];

  for (const importDeclaration of sourceFile.getImportDeclarations()) {
    const moduleFile = importDeclaration.getModuleSpecifierSourceFile();
    if (!moduleFile) continue;
    if (moduleFile.getFilePath().includes("/node_modules/")) continue;
    localFiles.push(moduleFile);
  }

  return localFiles;
}

// Dado un componente y el SourceFile donde vive, devuelve los nombres de
// los otros componentes detectados (Paso 2) de los que depende, segun sus
// imports locales. Un import que resuelve a un archivo sin componentes
// (util, hook, types) no aporta ninguna dependencia.
export function extractImports(
  component: DetectedComponent,
  sourceFile: SourceFile,
  allComponents: DetectedComponent[],
): string[] {
  const importedFilePaths = new Set<string>(
    getLocalImportedFiles(sourceFile).map((f) => f.getFilePath().toString()),
  );

  const dependencyNames = allComponents
    .filter((c) => c.name !== component.name && importedFilePaths.has(c.filePath))
    .map((c) => c.name);

  return Array.from(new Set(dependencyNames));
}
