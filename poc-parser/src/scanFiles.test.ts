import { describe, expect, it } from "vitest";
import path from "path";
import { scanFiles } from "./scanFiles";

const sampleProjectTsConfig = path.resolve(
  __dirname,
  "../../sample-project/tsconfig.json",
);

describe("scanFiles", () => {
  it("returns every .ts/.tsx file under sample-project/src", () => {
    const files = scanFiles(sampleProjectTsConfig).map((f) =>
      path.basename(f.getFilePath()),
    );

    expect(files.sort()).toEqual(
      [
        "App.tsx",
        "Badge.tsx",
        "Button.tsx",
        "Footer.tsx",
        "Header.tsx",
        "Icon.tsx",
        "Page.tsx",
        "ProtectedPage.tsx",
        "Sidebar.tsx",
        "formatDate.ts",
        "index.ts",
        "index.tsx",
        "types.ts",
        "useToggle.ts",
        "withAuth.tsx",
      ].sort(),
    );
  });

  it("excludes node_modules and dist as configured in the target tsconfig", () => {
    const files = scanFiles(sampleProjectTsConfig).map((f) => f.getFilePath());

    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
    expect(files.some((f) => f.includes("/dist/") || f.endsWith(".js"))).toBe(
      false,
    );
  });
});
