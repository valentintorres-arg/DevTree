import { EXPORT_TYPE_COLORS, EXPORT_TYPE_LABELS } from "./exportTypeColors";
import type { ExportType } from "./types";
import "./Legend.css";

const EXPORT_TYPES = Object.keys(EXPORT_TYPE_COLORS) as ExportType[];

// Explica que significa el color/texto que ya se muestra en cada nodo
// (ComponentNode) — pedido explicito del usuario: los componentes ya
// estaban "clasificados" por exportType, pero nada en la UI decia que
// significaba cada categoria.
export function Legend() {
  return (
    <div className="legend">
      <p className="legend__title">Cómo se detectó cada componente</p>
      {EXPORT_TYPES.map((exportType) => (
        <div key={exportType} className="legend__row">
          <span className="legend__swatch" style={{ background: EXPORT_TYPE_COLORS[exportType] }} />
          <span className="legend__label">{EXPORT_TYPE_LABELS[exportType]}</span>
        </div>
      ))}
    </div>
  );
}
