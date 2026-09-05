import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

export function Button({ variant = "default", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base = "inline-flex items-center justify-center rounded-full font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50";
  const variants: Record<Variant, string> = {
    default: "bg-zinc-900 text-white hover:bg-black",
    outline: "border bg-white hover:bg-zinc-50",
    ghost: "hover:bg-zinc-100",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<Size, string> = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-sm",
    icon: "w-8 h-8 p-0",
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
