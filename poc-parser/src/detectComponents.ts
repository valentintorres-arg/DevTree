import { ArrowFunction, FunctionDeclaration, Node, SourceFile, SyntaxKind } from "ts-morph";

export type ComponentExportType = "functionDeclaration" | "arrowFunction";

export interface DetectedComponent {
  name: string;
  filePath: string;
  exportType: ComponentExportType;
}

// Los hooks (useX) siguen la misma forma que un componente (function o
// arrow const) pero no son componentes, aunque tecnicamente devuelvan JSX
// en algun return interno. Se descartan por nombre.
const HOOK_NAME_PATTERN = /^use[A-Z0-9]/;

function isJsxNode(node: Node): boolean {
  return (
    Node.isJsxElement(node) ||
    Node.isJsxSelfClosingElement(node) ||
    Node.isJsxFragment(node)
  );
}

function expressionHasJsx(expr: Node): boolean {
  return isJsxNode(expr) || expr.getDescendants().some(isJsxNode);
}

const NESTED_FUNCTION_KINDS = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
]);

// Un componente devuelve JSX directamente en su propio cuerpo. Al bajar por
// el arbol nos salteamos funciones anidadas (ej. un callback de .map)
// para no confundir el JSX de un callback interno con el del componente.
function returnsJsx(fn: FunctionDeclaration | ArrowFunction): boolean {
  const body = fn.getBody();
  if (!body) return false;

  if (Node.isExpression(body)) {
    return expressionHasJsx(body);
  }

  let found = false;
  body.forEachDescendant((node, traversal) => {
    if (found) {
      traversal.stop();
      return;
    }
    if (NESTED_FUNCTION_KINDS.has(node.getKind())) {
      traversal.skip();
      return;
    }
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (expr && expressionHasJsx(expr)) {
        found = true;
      }
    }
  });

  return found;
}

// Para cada export del archivo, decide si es un componente React:
// function declarations o `const X = () => {...}` que devuelven JSX,
// ignorando hooks. Los exports default anonimos (`export default () =>
// ...`) no tienen nombre resoluble y quedan afuera (ver PLAN.md, casos
// pendientes).
export function detectComponents(sourceFile: SourceFile): DetectedComponent[] {
  const filePath = sourceFile.getFilePath();
  const found: DetectedComponent[] = [];

  for (const declarations of sourceFile.getExportedDeclarations().values()) {
    for (const declaration of declarations) {
      if (Node.isFunctionDeclaration(declaration)) {
        const name = declaration.getName();
        if (!name || HOOK_NAME_PATTERN.test(name)) continue;
        if (returnsJsx(declaration)) {
          found.push({ name, filePath, exportType: "functionDeclaration" });
        }
      } else if (Node.isVariableDeclaration(declaration)) {
        const initializer = declaration.getInitializer();
        if (!initializer || !Node.isArrowFunction(initializer)) continue;
        const name = declaration.getName();
        if (!name || HOOK_NAME_PATTERN.test(name)) continue;
        if (returnsJsx(initializer)) {
          found.push({ name, filePath, exportType: "arrowFunction" });
        }
      }
    }
  }

  // Un mismo componente puede aparecer bajo dos claves de export (ej.
  // `export const X` + `export default X`); dedupear por nombre+archivo.
  const seen = new Set<string>();
  return found.filter(({ name }) => {
    const key = `${filePath}:${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
