import { describe, expect, it } from "vitest";
import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";
import { extractImports } from "./extractImports";
import { buildGraph } from "./buildGraph";

const sampleProjectRoot = path.resolve(__dirname, "../../sample-project");
const sampleProjectTsConfig = path.join(sampleProjectRoot, "tsconfig.json");

describe("buildGraph", () => {
  it("produces the {components: [{id, filePath, dependencies}]} shape from PLAN.md", () => {
    const files = scanFiles(sampleProjectTsConfig);
    const componentsByFile = files.map((file) => ({
      file,
      components: detectComponents(file),
    }));
    const allComponents = componentsByFile.flatMap((f) => f.components);
    const entries = componentsByFile.flatMap(({ file, components }) =>
      components.map((component) => ({
        component,
        dependencies: extractImports(component, file, allComponents),
      })),
    );

    const graph = buildGraph(entries, sampleProjectRoot);

    expect(graph).toEqual({
      components: expect.arrayContaining([
        {
          id: "Button",
          filePath: "src/components/Button.tsx",
          dependencies: ["Icon"],
        },
      ]),
    });
    expect(graph.components).toHaveLength(5);
  });

  it("uses forward-slash relative paths regardless of the host OS separator", () => {
    const files = scanFiles(sampleProjectTsConfig);
    const graph = buildGraph(
      files.flatMap((file) =>
        detectComponents(file).map((component) => ({ component, dependencies: [] })),
      ),
      sampleProjectRoot,
    );

    for (const component of graph.components) {
      expect(component.filePath).not.toContain("\\");
      expect(path.isAbsolute(component.filePath)).toBe(false);
    }
  });
});
