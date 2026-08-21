import path from "path";
import { scanFiles } from "./scanFiles";

// Entry point del CLI. Por ahora (Paso 1) solo orquesta el escaneo de
// archivos del proyecto target y lo imprime; los pasos siguientes del plan
// (deteccion de componentes, imports, grafo) se van a enganchar aca.
const targetTsConfig = path.resolve(__dirname, "../../sample-project/tsconfig.json");

const sourceFiles = scanFiles(targetTsConfig);

console.log(`Archivos encontrados: ${sourceFiles.length}`);
for (const file of sourceFiles) {
  console.log(" -", path.relative(process.cwd(), file.getFilePath()));
}
