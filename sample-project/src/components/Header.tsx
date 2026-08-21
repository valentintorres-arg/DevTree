import React from "react";
import { Button } from "./Button";

type HeaderProps = {
  title: string;
};

export const Header = ({ title }: HeaderProps) => {
  return (
    <header>
      <h1>{title}</h1>
      <Button label="Menu" iconName="menu" />
    </header>
  );
};
