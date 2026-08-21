import React from "react";
import { formatYear } from "../utils/formatDate";

export const Footer = () => {
  return <footer>&copy; {formatYear(new Date())}</footer>;
};
