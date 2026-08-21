import React from "react";
import { Header, Footer } from "./components";
import { ProtectedPage } from "./components/ProtectedPage";
import { useToggle } from "./hooks/useToggle";

export function App() {
  const [expanded] = useToggle(false);

  return (
    <div className="app">
      <Header title="Sample Project" />
      {expanded ? <p>Expanded content</p> : null}
      <ProtectedPage />
      <Footer />
    </div>
  );
}
