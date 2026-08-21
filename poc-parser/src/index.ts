import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";
import { extractImports } from "./extractImports";

// Entry point del CLI. Por ahora (Pasos 1-3) orquesta el escaneo de
// archivos, la deteccion de componentes y la extraccion de sus
// dependencias locales; el paso siguiente (armar y escribir el grafo) se
// va a enganchar aca.
const targetTsConfig = path.resolve(__dirname, "../../sample-project/tsconfig.json");

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

console.log(`\nDependencias locales:`);
for (const { file, components } of componentsByFile) {
  for (const component of components) {
    const dependencies = extractImports(component, file, allComponents);
    console.log(` - ${component.name} -> [${dependencies.join(", ")}]`);
  }
}
