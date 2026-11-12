import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-token font-semibold transition active:translate-y-px disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white [[data-theme=dark]_&]:text-bg hover:brightness-110",
  secondary: "bg-surface text-fg border border-line hover:bg-surface2",
  ghost: "text-fg hover:bg-surface2",
};
const sizes: Record<Size, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5", lg: "px-6 py-3.5 text-lg" };

type Props = { variant?: Variant; size?: Size; href?: string; children: ReactNode; className?: string } &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: Props) {
  const cls = cn(base, variants[variant], sizes[size], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}
