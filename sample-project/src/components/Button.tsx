import React from "react";
import { Icon } from "./Icon";

type ButtonProps = {
  label: string;
  iconName?: string;
  onClick?: () => void;
};

export function Button({ label, iconName, onClick }: ButtonProps) {
  return (
    <button onClick={onClick}>
      {iconName ? <Icon name={iconName} /> : null}
      {label}
    </button>
  );
}
