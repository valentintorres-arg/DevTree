import React from "react";

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function Authenticated(props: P) {
    return <Component {...props} />;
  };
}
