import { describe, expect, it } from "vitest";
import path from "path";
import { Project, ts } from "ts-morph";
import { scanFiles } from "./scanFiles";
import { detectComponents } from "./detectComponents";

const sampleProjectTsConfig = path.resolve(
  __dirname,
  "../../sample-project/tsconfig.json",
);

describe("detectComponents against sample-project", () => {
  it("detects exactly the components, with the right exportType", () => {
    const files = scanFiles(sampleProjectTsConfig);
    const components = files.flatMap(detectComponents);

    const byName = Object.fromEntries(components.map((c) => [c.name, c.exportType]));

    expect(byName).toEqual({
      App: "functionDeclaration",
      Badge: "anonymousDefaultArrow",
      Button: "functionDeclaration",
      Footer: "arrowFunction",
      Header: "arrowFunction",
      Icon: "arrowFunction",
      Page: "functionDeclaration",
      ProtectedPage: "hocWrapped",
    });
  });

  it("does not treat hooks, utils or type-only files as components", () => {
    const files = scanFiles(sampleProjectTsConfig);
    const names = files.flatMap(detectComponents).map((c) => c.name);

    expect(names).not.toContain("useToggle");
    expect(names).not.toContain("formatYear");
  });
});

// Casos borde con un proyecto en memoria, sin tocar sample-project.
function detectFromSource(source: string) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
  });
  const file = project.createSourceFile("virtual.tsx", source);
  return detectComponents(file);
}

describe("detectComponents edge cases", () => {
  it("detects a function declaration with an explicit JSX return", () => {
    const result = detectFromSource(`
      export function Card() {
        return <div className="card" />;
      }
    `);
    expect(result).toEqual([
      { name: "Card", filePath: "/virtual.tsx", exportType: "functionDeclaration" },
    ]);
  });

  it("detects an arrow const with an implicit JSX return", () => {
    const result = detectFromSource(`
      export const Card = () => <div className="card" />;
    `);
    expect(result).toEqual([
      { name: "Card", filePath: "/virtual.tsx", exportType: "arrowFunction" },
    ]);
  });

  it("ignores hook-named exports even if they contain JSX in a return", () => {
    const result = detectFromSource(`
      export function useWeirdHook() {
        if (Math.random() > 2) return <div />;
        return null;
      }
    `);
    expect(result).toEqual([]);
  });

  it("does not treat JSX from a nested unrelated function as the outer function's own return", () => {
    const result = detectFromSource(`
      export function Toolbar() {
        const renderIcon = () => <span>icon</span>;
        return null;
      }
    `);
    expect(result).toEqual([]);
  });

  it("ignores non-exported declarations", () => {
    const result = detectFromSource(`
      function Internal() {
        return <div />;
      }
    `);
    expect(result).toEqual([]);
  });
});

// Paso 7: `export default function () {...}` / `export default () => {...}`
// no tienen nombre propio; se deriva del archivo. Se usa un archivo real
// (no /virtual.tsx) para poder controlar el nombre derivado.
function detectFromNamedFile(fileName: string, source: string) {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX },
  });
  const file = project.createSourceFile(fileName, source);
  return detectComponents(file);
}

describe("detectComponents anonymous default exports (Paso 7)", () => {
  it("derives the name from the file for an anonymous default function", () => {
    const result = detectFromNamedFile(
      "/Modal.tsx",
      `export default function () { return <div className="modal" />; }`,
    );
    expect(result).toEqual([
      { name: "Modal", filePath: "/Modal.tsx", exportType: "anonymousDefaultFunction" },
    ]);
  });

  it("derives the name from the file for an anonymous default arrow", () => {
    const result = detectFromNamedFile(
      "/Modal.tsx",
      `export default () => <div className="modal" />;`,
    );
    expect(result).toEqual([
      { name: "Modal", filePath: "/Modal.tsx", exportType: "anonymousDefaultArrow" },
    ]);
  });

  it("still ignores an anonymous default export whose derived name looks like a hook", () => {
    const result = detectFromNamedFile(
      "/useModal.tsx",
      `export default () => { if (Math.random() > 2) return <div />; return null; };`,
    );
    expect(result).toEqual([]);
  });
});

describe("detectComponents HOC-wrapped exports (Paso 8)", () => {
  it("detects a HOC-wrapped component (PascalCase name + PascalCase argument)", () => {
    const result = detectFromSource(`
      export const ProtectedPage = withAuth(Page);
    `);
    expect(result).toEqual([
      { name: "ProtectedPage", filePath: "/virtual.tsx", exportType: "hocWrapped" },
    ]);
  });

  it("detects a curried HOC (connect(mapState)(Widget))", () => {
    const result = detectFromSource(`
      export const ConnectedWidget = connect(mapStateToProps)(Widget);
    `);
    expect(result).toEqual([
      { name: "ConnectedWidget", filePath: "/virtual.tsx", exportType: "hocWrapped" },
    ]);
  });

  it("detects a HOC-wrapped default export with no variable name, from the file name", () => {
    const result = detectFromNamedFile(
      "/ProtectedPage.tsx",
      `export default withAuth(Page);`,
    );
    expect(result).toEqual([
      { name: "ProtectedPage", filePath: "/ProtectedPage.tsx", exportType: "hocWrapped" },
    ]);
  });

  it("does not treat a no-argument call as a HOC (avoids an obvious false positive)", () => {
    const result = detectFromSource(`
      export const Logger = createLogger();
    `);
    expect(result).toEqual([]);
  });

  it("does not treat a lowercase-named call assignment as a component", () => {
    const result = detectFromSource(`
      export const protectedPage = withAuth(Page);
    `);
    expect(result).toEqual([]);
  });
});
