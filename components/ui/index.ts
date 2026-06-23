export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
export type InputVariant = "default" | "outline" | "filled";
export type CardVariant = "default" | "bento" | "elevated";

export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}
