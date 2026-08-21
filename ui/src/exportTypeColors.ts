import type { ExportType } from "./types";

// Fuente unica de verdad para el color de cada exportType — usado por
// ComponentNode (badge de cada nodo) y Legend (que explica que
// significa cada color), para que no puedan desincronizarse.
export const EXPORT_TYPE_COLORS: Record<ExportType, string> = {
  functionDeclaration: "#128577",
  arrowFunction: "#a8690a",
  anonymousDefaultFunction: "#3a6bc2",
  anonymousDefaultArrow: "#b53a70",
  hocWrapped: "#7c3aed",
};

export const EXPORT_TYPE_LABELS: Record<ExportType, string> = {
  functionDeclaration: "function declaration",
  arrowFunction: "arrow function",
  anonymousDefaultFunction: "default export anónimo (function)",
  anonymousDefaultArrow: "default export anónimo (arrow)",
  hocWrapped: "envuelto en un HOC",
};
