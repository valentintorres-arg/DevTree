import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";

// Entry point del CLI. Por ahora (Pasos 1-2) orquesta el escaneo de
// archivos y la deteccion de componentes; los pasos siguientes del plan
// (imports, grafo) se van a enganchar aca.
const targetTsConfig = path.resolve(__dirname, "../../sample-project/tsconfig.json");

const sourceFiles = scanFiles(targetTsConfig);

console.log(`Archivos encontrados: ${sourceFiles.length}`);
for (const file of sourceFiles) {
  console.log(" -", path.relative(process.cwd(), file.getFilePath()));
}

const components = sourceFiles.flatMap(detectComponents);

console.log(`\nComponentes detectados: ${components.length}`);
for (const component of components) {
  console.log(
    ` - ${component.name} (${component.exportType}) — ${path.relative(process.cwd(), component.filePath)}`,
  );
}
