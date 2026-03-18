import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const variants = {
  default: "bg-surface-100 text-gray-400",
  blue: "bg-brand-900 text-brand-300",
  green: "bg-emerald-900 text-emerald-300",
  red: "bg-red-900 text-red-300",
  yellow: "bg-yellow-900 text-yellow-300",
  purple: "bg-purple-900 text-purple-300",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
