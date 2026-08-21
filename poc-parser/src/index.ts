import fs from "fs";
import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";
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

const componentsByFile = sourceFiles.map((file) => ({
  file,
  components: detectComponents(file),
}));
const allComponents = componentsByFile.flatMap((f) => f.components);

console.log(`\nComponentes detectados: ${allComponents.length}`);
for (const component of allComponents) {
  console.log(
    ` - ${component.name} (${component.exportType}) — ${path.relative(process.cwd(), component.filePath)}`,
  );
}

const entries = componentsByFile.flatMap(({ file, components }) =>
  components.map((component) => ({
    component,
    dependencies: extractImports(component, file, allComponents),
  })),
);

console.log(`\nDependencias locales:`);
for (const { component, dependencies } of entries) {
  console.log(` - ${component.name} -> [${dependencies.join(", ")}]`);
}

const graph = buildGraph(entries, targetProjectRoot);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2) + "\n", "utf-8");

console.log(`\nGrafo escrito en ${path.relative(process.cwd(), outputPath)}`);
