import fs from "fs";
import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents, dedupeComponents } from "./detectComponents";
import { extractImports } from "./extractImports";
import { buildGraph } from "./buildGraph";

// Entry point del CLI: escanea el proyecto target, detecta componentes,
// resuelve sus dependencias locales y escribe el grafo resultante en
// output/graph.json (ver PLAN.md, Pasos 1-4).
const targetProjectRoot = path.resolve(__dirname, "../../sample-project");
const targetTsConfig = path.join(targetProjectRoot, "tsconfig.json");
const outputPath = path.resolve(__dirname, "../output/graph.json");

const sourceFiles = scanFiles(targetTsConfig);

console.log(`Archivos encontrados: ${sourceFiles.length}`);
for (const file of sourceFiles) {
  console.log(" -", path.relative(process.cwd(), file.getFilePath()));
}

// Un componente re-exportado por un barrel (Paso 6) se "encuentra" tanto
// al escanear su archivo original como al escanear el barrel — el
// filePath ya resuelve al archivo real en ambos casos, asi que se
// dedupea globalmente (no solo dentro de un mismo archivo).
const fileByPath = new Map(sourceFiles.map((file) => [file.getFilePath() as string, file]));
const allComponents = dedupeComponents(sourceFiles.flatMap((file) => detectComponents(file)));

console.log(`\nComponentes detectados: ${allComponents.length}`);
for (const component of allComponents) {
  console.log(
    ` - ${component.name} (${component.exportType}) — ${path.relative(process.cwd(), component.filePath)}`,
  );
}

const entries = allComponents.map((component) => {
  const file = fileByPath.get(component.filePath);
  if (!file) {
    throw new Error(`No se encontro el SourceFile para ${component.filePath}`);
  }
  return {
    component,
    dependencies: extractImports(component, file, allComponents),
  };
});

console.log(`\nDependencias locales:`);
for (const { component, dependencies } of entries) {
  console.log(` - ${component.name} -> [${dependencies.join(", ")}]`);
}

const graph = buildGraph(entries, targetProjectRoot);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2) + "\n", "utf-8");

console.log(`\nGrafo escrito en ${path.relative(process.cwd(), outputPath)}`);
