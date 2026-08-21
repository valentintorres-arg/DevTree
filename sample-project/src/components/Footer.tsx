import React from "react";
import Badge from "./Badge";
import { formatYear } from "../utils/formatDate";

export const Footer = () => {
  return (
    <footer>
      &copy; {formatYear(new Date())}
      <Badge />
    </footer>
  );
};
