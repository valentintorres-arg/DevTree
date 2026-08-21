import React from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { useToggle } from "./hooks/useToggle";

export function App() {
  const [expanded] = useToggle(false);

  return (
    <div className="app">
      <Header title="Sample Project" />
      {expanded ? <p>Expanded content</p> : null}
      <Footer />
    </div>
  );
}
