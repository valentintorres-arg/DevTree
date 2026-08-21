import { useEffect, useRef, useState } from "react";
import "./CreateComponentModal.css";

interface CreateComponentModalProps {
  onCancel: () => void;
  onCreate: (name: string) => void;
  submitError: string | null;
}

const PASCAL_CASE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

// Reemplaza el window.prompt() original (Paso UI-6): un dialogo nativo
// del browser no se puede estilar ni validar en el momento, y un error
// del servidor (ej. 409 si el archivo ya existe) quedaba invisible
// detras del propio prompt. Este modal valida el formato en el momento
// y muestra el error del servidor (submitError) sin cerrarse, para que
// se pueda corregir el nombre sin perder el dialogo.
export function CreateComponentModal({
  onCancel,
  onCreate,
  submitError,
}: CreateComponentModalProps) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const trimmed = name.trim();
  const isValid = PASCAL_CASE_PATTERN.test(trimmed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onCreate(trimmed);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2 className="modal__title">Nuevo componente</h2>
        <label className="modal__label" htmlFor="component-name">
          Nombre (PascalCase)
        </label>
        <input
          ref={inputRef}
          id="component-name"
          className="modal__input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="MyWidget"
        />
        {name.trim().length > 0 && !isValid && (
          <p className="modal__error">Tiene que empezar con mayúscula, sin espacios ni símbolos.</p>
        )}
        {submitError && <p className="modal__error">{submitError}</p>}
        <p className="modal__hint">
          Crea src/components/{trimmed || "Nombre"}.tsx en el proyecto target.
        </p>
        <div className="modal__actions">
          <button
            type="button"
            className="modal__button modal__button--secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="modal__button modal__button--primary"
            disabled={!isValid}
          >
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}
