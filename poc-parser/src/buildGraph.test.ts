import { describe, expect, it } from "vitest";
import path from "path";
import { scanFiles } from "./scanFiles";
import { detectComponents, dedupeComponents } from "./detectComponents";
import { extractImports } from "./extractImports";
import { buildGraph } from "./buildGraph";

const sampleProjectRoot = path.resolve(__dirname, "../../sample-project");
const sampleProjectTsConfig = path.join(sampleProjectRoot, "tsconfig.json");

describe("buildGraph", () => {
  it("produces the {components: [{id, filePath, dependencies}]} shape from PLAN.md", () => {
    // Mismo pipeline que index.ts: dedupear globalmente, ya que el barrel
    // (components/index.ts) re-descubre los mismos componentes.
    const files = scanFiles(sampleProjectTsConfig);
    const fileByPath = new Map(files.map((f) => [f.getFilePath() as string, f]));
    const allComponents = dedupeComponents(files.flatMap(detectComponents));
    const entries = allComponents.map((component) => ({
      component,
      dependencies: extractImports(component, fileByPath.get(component.filePath)!, allComponents),
    }));

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
