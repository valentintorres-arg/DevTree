import React from "react";

type IconProps = {
  name: string;
};

export const Icon = ({ name }: IconProps) => {
  return <span className={`icon icon-${name}`} />;
};
