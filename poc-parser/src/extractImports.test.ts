import { describe, expect, it } from "vitest";
import path from "path";
import { Project, ts } from "ts-morph";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";
import { extractImports } from "./extractImports";

const sampleProjectTsConfig = path.resolve(
  __dirname,
  "../../sample-project/tsconfig.json",
);

describe("extractImports against sample-project", () => {
  it("resolves the expected component dependency graph", () => {
    const files = scanFiles(sampleProjectTsConfig);
    const componentsByFile = files.map((file) => ({
      file,
      components: detectComponents(file),
    }));
    const allComponents = componentsByFile.flatMap((f) => f.components);

    const graph: Record<string, string[]> = {};
    for (const { file, components } of componentsByFile) {
      for (const component of components) {
        graph[component.name] = extractImports(component, file, allComponents).sort();
      }
    }

    expect(graph).toEqual({
      App: ["Footer", "Header"],
      Button: ["Icon"],
      Footer: [],
      Header: ["Button"],
      Icon: [],
    });
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
});
