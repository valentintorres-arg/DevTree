import path from "path";
import {
  ArrowFunction,
  CallExpression,
  FunctionDeclaration,
  Node,
  SourceFile,
  SyntaxKind,
} from "ts-morph";

export type ComponentExportType =
  | "functionDeclaration"
  | "arrowFunction"
  | "anonymousDefaultFunction"
  | "anonymousDefaultArrow"
  | "hocWrapped";

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

// Un `export default function () {...}` o `export default () => {...}`
// no tiene identificador propio (getName() da undefined, o directamente
// no hay VariableDeclaration de la cual sacar un nombre). Se deriva del
// nombre de archivo (sin extension), convencion habitual de "un
// componente por archivo" en proyectos React (Paso 7). Riesgo aceptado:
// dos archivos con el mismo nombre en carpetas distintas colisionarian
// en el grafo — el mismo riesgo que ya existe para dos componentes con
// nombre igual en archivos distintos, porque el `id` del grafo es el
// nombre, no la ruta.
function deriveNameFromFilePath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

const PASCAL_CASE_PATTERN = /^[A-Z]/;

// Un HOC (`withAuth(Page)`, `connect(mapState)(Widget)`, `React.memo(Widget)`)
// no tiene un body de funcion propio que analizar con returnsJsx — viene de
// una funcion casi siempre externa al archivo. Sin poder verificar JSX, se
// usa el nombre + shape como proxy: PascalCase (convencion de componentes) y
// al menos un argumento que sea un Identifier PascalCase (proxy de "envuelve
// a un componente"). Esto excluye a proposito falsos positivos obvios como
// `const Logger = createLogger()` (sin argumentos), aunque sigue habiendo
// falsos positivos/negativos posibles que no se pueden resolver
// estaticamente (ver PLAN.md, Paso 8).
function looksLikeHocCall(call: CallExpression): boolean {
  return call
    .getArguments()
    .some((arg) => Node.isIdentifier(arg) && PASCAL_CASE_PATTERN.test(arg.getText()));
}

// Para cada export del archivo, decide si es un componente React:
// function declarations, `const X = () => {...}` (arrow) o un default
// anonimo (function o arrow) que devuelven JSX, ignorando hooks.
//
// `getExportedDeclarations()` resuelve automaticamente los re-exports
// desde un barrel (`export { Button } from './Button'`), devolviendo la
// declaracion real aunque `sourceFile` sea el barrel y no el archivo
// original — por eso el filePath de cada componente se toma de
// `declaration.getSourceFile()`, no del `sourceFile` recibido.
export function detectComponents(sourceFile: SourceFile): DetectedComponent[] {
  const found: DetectedComponent[] = [];

  for (const declarations of sourceFile.getExportedDeclarations().values()) {
    for (const declaration of declarations) {
      if (Node.isFunctionDeclaration(declaration)) {
        const declarationFilePath = declaration.getSourceFile().getFilePath();
        const name = declaration.getName() ?? deriveNameFromFilePath(declarationFilePath);
        if (HOOK_NAME_PATTERN.test(name)) continue;
        if (returnsJsx(declaration)) {
          found.push({
            name,
            filePath: declarationFilePath,
            exportType: declaration.getName() ? "functionDeclaration" : "anonymousDefaultFunction",
          });
        }
      } else if (Node.isVariableDeclaration(declaration)) {
        const initializer = declaration.getInitializer();
        const name = declaration.getName();
        if (!initializer || !name || HOOK_NAME_PATTERN.test(name)) continue;

        if (Node.isArrowFunction(initializer)) {
          if (returnsJsx(initializer)) {
            found.push({
              name,
              filePath: declaration.getSourceFile().getFilePath(),
              exportType: "arrowFunction",
            });
          }
        } else if (
          Node.isCallExpression(initializer) &&
          PASCAL_CASE_PATTERN.test(name) &&
          looksLikeHocCall(initializer)
        ) {
          // `const ProtectedPage = withAuth(Page);` — no hay body de
          // funcion que verificar con returnsJsx (ver looksLikeHocCall).
          found.push({
            name,
            filePath: declaration.getSourceFile().getFilePath(),
            exportType: "hocWrapped",
          });
        }
      } else if (Node.isArrowFunction(declaration)) {
        // `export default () => {...}`: el nodo declaracion es la arrow
        // function misma, no envuelta en una VariableDeclaration.
        const declarationFilePath = declaration.getSourceFile().getFilePath();
        const name = deriveNameFromFilePath(declarationFilePath);
        if (HOOK_NAME_PATTERN.test(name)) continue;
        if (returnsJsx(declaration)) {
          found.push({
            name,
            filePath: declarationFilePath,
            exportType: "anonymousDefaultArrow",
          });
        }
      } else if (Node.isCallExpression(declaration)) {
        // `export default withAuth(Page);` sin variable intermedia: el
        // nodo declaracion es el CallExpression directo.
        const declarationFilePath = declaration.getSourceFile().getFilePath();
        const name = deriveNameFromFilePath(declarationFilePath);
        if (HOOK_NAME_PATTERN.test(name)) continue;
        if (looksLikeHocCall(declaration)) {
          found.push({
            name,
            filePath: declarationFilePath,
            exportType: "hocWrapped",
          });
        }
      }
    }
  }

  return dedupeComponents(found);
}

// Un mismo componente puede aparecer mas de una vez: por dos claves de
// export en su propio archivo (`export const X` + `export default X`),
// o porque un barrel lo re-exporta y tanto su archivo original como el
// barrel lo "encuentran" al escanear el proyecto completo (Paso 6).
// Dedupear por archivo+nombre, quedandose con la primera aparicion.
export function dedupeComponents(
  components: DetectedComponent[],
): DetectedComponent[] {
  const seen = new Set<string>();
  return components.filter(({ name, filePath }) => {
    const key = `${filePath}:${name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
