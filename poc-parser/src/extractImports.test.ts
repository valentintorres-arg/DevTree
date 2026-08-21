import { describe, expect, it } from "vitest";
import path from "path";
import { Project, ts } from "ts-morph";
import { scanFiles } from "./scanFiles";
import { detectComponents, dedupeComponents } from "./detectComponents";
import { extractImports } from "./extractImports";

const sampleProjectTsConfig = path.resolve(
  __dirname,
  "../../sample-project/tsconfig.json",
);

describe("extractImports against sample-project", () => {
  it("resolves the expected component dependency graph", () => {
    // Mismo pipeline que index.ts: dedupear globalmente y resolver el
    // SourceFile de cada componente por su filePath real, no por el
    // archivo donde se lo "encontro" — necesario porque el barrel
    // (components/index.ts) re-descubre Button/Header/Footer/Icon.
    const files = scanFiles(sampleProjectTsConfig);
    const fileByPath = new Map(files.map((f) => [f.getFilePath() as string, f]));
    const allComponents = dedupeComponents(files.flatMap(detectComponents));

    const graph: Record<string, string[]> = {};
    for (const component of allComponents) {
      const file = fileByPath.get(component.filePath)!;
      graph[component.name] = extractImports(component, file, allComponents).sort();
    }

    expect(graph).toEqual({
      App: ["Footer", "Header"],
      Button: ["Icon"],
      Footer: [],
      Header: ["Button"],
      Icon: [],
    });
  });

  it("resolves a component imported through a barrel (components/index.ts) to its real file", () => {
    // App.tsx importa Header/Footer desde el barrel, no desde su ruta
    // directa — este test aisla especificamente ese caso (Paso 6).
    const files = scanFiles(sampleProjectTsConfig);
    const allComponents = dedupeComponents(files.flatMap(detectComponents));
    const appFile = files.find((f) => f.getFilePath().endsWith("App.tsx"))!;
    const app = allComponents.find((c) => c.name === "App")!;

    const deps = extractImports(app, appFile, allComponents).sort();
    expect(deps).toEqual(["Footer", "Header"]);
  });
});

// Casos borde con un proyecto en memoria, sin tocar sample-project.
function buildProject(files: Record<string, string>) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
  });
  for (const [filePath, content] of Object.entries(files)) {
    project.createSourceFile(filePath, content);
  }
  return project;
}

describe("extractImports edge cases", () => {
  it("ignores external package imports that don't resolve to a project file", () => {
    const project = buildProject({
      "/Card.tsx": `
        import React from "react";
        export const Card = () => <div />;
      `,
    });
    const file = project.getSourceFileOrThrow("/Card.tsx");
    const component = detectComponents(file)[0];

    const deps = extractImports(component, file, [component]);
    expect(deps).toEqual([]);
  });

  it("does not report a dependency on a locally-imported non-component file", () => {
    const project = buildProject({
      "/format.ts": `export const format = (n: number) => n.toString();`,
      "/Card.tsx": `
        import { format } from "./format";
        export const Card = () => <div>{format(1)}</div>;
      `,
    });
    const cardFile = project.getSourceFileOrThrow("/Card.tsx");
    const card = detectComponents(cardFile)[0];

    const deps = extractImports(card, cardFile, [card]);
    expect(deps).toEqual([]);
  });

  it("resolves an import to another detected component by file, not just by name", () => {
    const project = buildProject({
      "/Icon.tsx": `export const Icon = () => <span />;`,
      "/Button.tsx": `
        import { Icon } from "./Icon";
        export const Button = () => <button><Icon /></button>;
      `,
    });
    const iconFile = project.getSourceFileOrThrow("/Icon.tsx");
    const buttonFile = project.getSourceFileOrThrow("/Button.tsx");
    const icon = detectComponents(iconFile)[0];
    const button = detectComponents(buttonFile)[0];

    const deps = extractImports(button, buttonFile, [icon, button]);
    expect(deps).toEqual(["Icon"]);
  });

  it("resolves a barrel re-export (export { X } from './X') to the original file", () => {
    const project = buildProject({
      "/Icon.tsx": `export const Icon = () => <span />;`,
      "/index.ts": `export { Icon } from "./Icon";`,
      "/Button.tsx": `
        import { Icon } from "./index";
        export const Button = () => <button><Icon /></button>;
      `,
    });
    const iconFile = project.getSourceFileOrThrow("/Icon.tsx");
    const buttonFile = project.getSourceFileOrThrow("/Button.tsx");
    const icon = detectComponents(iconFile)[0];
    const button = detectComponents(buttonFile)[0];

    const deps = extractImports(button, buttonFile, [icon, button]);
    expect(deps).toEqual(["Icon"]);
  });

  it("resolves an aliased default re-export (export { default as X } from './X')", () => {
    const project = buildProject({
      "/Icon.tsx": `export default function Icon() { return <span />; }`,
      "/index.ts": `export { default as Icon } from "./Icon";`,
      "/Button.tsx": `
        import { Icon } from "./index";
        export const Button = () => <button><Icon /></button>;
      `,
    });
    const iconFile = project.getSourceFileOrThrow("/Icon.tsx");
    const buttonFile = project.getSourceFileOrThrow("/Button.tsx");
    const icon = detectComponents(iconFile)[0];
    const button = detectComponents(buttonFile)[0];

    const deps = extractImports(button, buttonFile, [icon, button]);
    expect(deps).toEqual(["Icon"]);
  });

  it("resolves through a barrel-of-barrels (two levels of re-export)", () => {
    const project = buildProject({
      "/Icon.tsx": `export const Icon = () => <span />;`,
      "/inner-index.ts": `export { Icon } from "./Icon";`,
      "/outer-index.ts": `export { Icon } from "./inner-index";`,
      "/Button.tsx": `
        import { Icon } from "./outer-index";
        export const Button = () => <button><Icon /></button>;
      `,
    });
    const iconFile = project.getSourceFileOrThrow("/Icon.tsx");
    const buttonFile = project.getSourceFileOrThrow("/Button.tsx");
    const icon = detectComponents(iconFile)[0];
    const button = detectComponents(buttonFile)[0];

    const deps = extractImports(button, buttonFile, [icon, button]);
    expect(deps).toEqual(["Icon"]);
  });
});
