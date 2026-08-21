import React, { Suspense } from "react";
import { Header, Footer } from "./components";
import { ProtectedPage } from "./components/ProtectedPage";
import { useToggle } from "./hooks/useToggle";

const LazySidebar = React.lazy(() => import("./components/Sidebar"));

export function App() {
  const [expanded] = useToggle(false);

  return (
    <div className="app">
      <Header title="Sample Project" />
      {expanded ? <p>Expanded content</p> : null}
      <ProtectedPage />
      <Suspense fallback={null}>
        <LazySidebar />
      </Suspense>
      <Footer />
    </div>
  );
}
