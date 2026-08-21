import { Node, SourceFile, SyntaxKind } from "ts-morph";
import { DetectedComponent } from "./detectComponents";

// Sigue la cadena de alias de un binding importado (import -> re-export
// -> ... ) hasta el simbolo real detras, via el type checker de
// TypeScript. Necesario para que un import a traves de un barrel
// (`import { Button } from './components'`, con `components/index.ts`
// haciendo `export { Button } from './Button'`) resuelva al archivo
// original (Button.tsx) y no se quede en el barrel (Paso 6).
function resolveAliasedSourceFile(bindingNode: Node): SourceFile | undefined {
  let symbol = bindingNode.getSymbol();
  while (symbol?.isAlias()) {
    const aliased = symbol.getAliasedSymbol();
    if (!aliased || aliased === symbol) break;
    symbol = aliased;
  }
  return symbol?.getValueDeclaration()?.getSourceFile();
}

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

    const bindingNodes: Node[] = [
      ...importDeclaration.getNamedImports().map((named) => named.getNameNode()),
      ...(importDeclaration.getDefaultImport() ? [importDeclaration.getDefaultImport()!] : []),
      ...(importDeclaration.getNamespaceImport() ? [importDeclaration.getNamespaceImport()!] : []),
    ];

    if (bindingNodes.length === 0) {
      // Import de solo efecto (ej. `import "./styles.css"`), sin bindings
      // que resolver: se mantiene el archivo del module specifier tal cual.
      localFiles.push(moduleFile);
      continue;
    }

    for (const bindingNode of bindingNodes) {
      localFiles.push(resolveAliasedSourceFile(bindingNode) ?? moduleFile);
    }
  }

  return localFiles;
}

// `React.lazy(() => import('./Sidebar'))` usa un import() dinamico, que es
// un CallExpression (no un ImportDeclaration) y por eso invisible para
// getLocalImportedFiles. El string literal del specifier resuelve, via su
// simbolo, directamente al SourceFile importado (Paso 9) — igual de
// confiable que getModuleSpecifierSourceFile() para imports estaticos.
function getDynamicallyImportedFiles(sourceFile: SourceFile): SourceFile[] {
  const files: SourceFile[] = [];

  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;

    const [specifier] = call.getArguments();
    const targetFile = specifier?.getSymbol()?.getDeclarations().find(Node.isSourceFile);
    if (targetFile && !targetFile.getFilePath().includes("/node_modules/")) {
      files.push(targetFile);
    }
  }

  return files;
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
    [...getLocalImportedFiles(sourceFile), ...getDynamicallyImportedFiles(sourceFile)].map((f) =>
      f.getFilePath().toString(),
    ),
  );

  const dependencyNames = allComponents
    .filter((c) => c.name !== component.name && importedFilePaths.has(c.filePath))
    .map((c) => c.name);

  return Array.from(new Set(dependencyNames));
}
