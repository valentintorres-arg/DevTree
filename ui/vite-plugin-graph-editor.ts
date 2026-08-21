import fs from "fs";
import path from "path";
import type { IncomingMessage } from "http";
import type { Plugin, ViteDevServer } from "vite";
import { Project } from "ts-morph";

// Fase 2 de UI_PLAN.md: agregar un componente nuevo y conectarlo desde
// la UI escribe archivos reales en el proyecto target. Un browser no
// puede tocar el filesystem por su cuenta, asi que este plugin agrega
// un par de endpoints sobre el mismo proceso de `pnpm run dev`
// (configureServer) en vez de correr un backend aparte. Solo existe en
// dev: `vite build` no incluye middlewares de plugins.
const TARGET_PROJECT_ROOT = path.resolve(import.meta.dirname, "../sample-project");
const COMPONENTS_DIR = "src/components";

const PASCAL_CASE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
    req.on("error", reject);
  });
}

// Ruta de import relativa entre dos archivos del proyecto target, sin
// extension y con "/" (no separadores de Windows), con "./" al frente
// si hace falta — la misma forma que ya escribe un desarrollador a mano.
function relativeImportSpecifier(fromAbsolutePath: string, toAbsolutePath: string): string {
  const withoutExt = toAbsolutePath.replace(/\.tsx?$/, "");
  let specifier = path
    .relative(path.dirname(fromAbsolutePath), withoutExt)
    .split(path.sep)
    .join("/");
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
}

export function graphEditorApiPlugin(): Plugin {
  return {
    name: "devtree-graph-editor-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/components", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        try {
          const body = (await readJsonBody(req)) as { name?: unknown };
          const name = typeof body.name === "string" ? body.name.trim() : "";

          if (!PASCAL_CASE_PATTERN.test(name)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "El nombre debe ser PascalCase (ej. MyWidget)." }));
            return;
          }

          const relativeFilePath = `${COMPONENTS_DIR}/${name}.tsx`;
          const absoluteFilePath = path.join(TARGET_PROJECT_ROOT, relativeFilePath);

          if (fs.existsSync(absoluteFilePath)) {
            res.statusCode = 409;
            res.end(JSON.stringify({ error: `${relativeFilePath} ya existe.` }));
            return;
          }

          const stub = [
            'import React from "react";',
            "",
            `export function ${name}() {`,
            `  return <div>${name}</div>;`,
            "}",
            "",
          ].join("\n");

          fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
          fs.writeFileSync(absoluteFilePath, stub, "utf-8");

          res.statusCode = 201;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ id: name, filePath: relativeFilePath }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });

      server.middlewares.use("/api/connections", async (req, res) => {
        if (req.method !== "POST" && req.method !== "DELETE") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        try {
          const body = (await readJsonBody(req)) as {
            fromFilePath?: unknown;
            toFilePath?: unknown;
            toName?: unknown;
          };
          const { fromFilePath, toFilePath, toName } = body;

          if (
            typeof fromFilePath !== "string" ||
            typeof toFilePath !== "string" ||
            typeof toName !== "string"
          ) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "fromFilePath, toFilePath y toName son requeridos." }));
            return;
          }

          const fromAbsolute = path.join(TARGET_PROJECT_ROOT, fromFilePath);
          const toAbsolute = path.join(TARGET_PROJECT_ROOT, toFilePath);

          if (!fs.existsSync(fromAbsolute)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: `${fromFilePath} no existe.` }));
            return;
          }

          const project = new Project({
            tsConfigFilePath: path.join(TARGET_PROJECT_ROOT, "tsconfig.json"),
          });
          const sourceFile = project.addSourceFileAtPath(fromAbsolute);
          const specifier = relativeImportSpecifier(fromAbsolute, toAbsolute);

          const existing = sourceFile.getImportDeclaration(
            (decl) => decl.getModuleSpecifierValue() === specifier,
          );

          if (req.method === "POST") {
            if (existing) {
              const alreadyImported = existing
                .getNamedImports()
                .some((named) => named.getName() === toName);
              if (!alreadyImported) {
                existing.addNamedImport(toName);
              }
            } else {
              sourceFile.addImportDeclaration({
                moduleSpecifier: specifier,
                namedImports: [toName],
              });
            }
          } else {
            // DELETE: sacar el named import; si el import declaration se
            // queda sin ninguno (y sin default/namespace import), borrarlo
            // entero — no dejar un `import "./ruta";` huerfano sin sentido.
            if (existing) {
              const namedImport = existing.getNamedImports().find((n) => n.getName() === toName);
              namedImport?.remove();
              if (
                existing.getNamedImports().length === 0 &&
                !existing.getDefaultImport() &&
                !existing.getNamespaceImport()
              ) {
                existing.remove();
              }
            }
          }

          sourceFile.saveSync();

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        }
      });
    },
  };
}
