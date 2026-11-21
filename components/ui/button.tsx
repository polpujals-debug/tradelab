import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary-hover text-white shadow-[0_0_0_1px_rgb(96_165_250/0.4),0_8px_24px_-10px_rgb(37_99_235/0.8)] hover:bg-[#1d4ed8]",
        secondary: "bg-card text-fg border border-border hover:border-border-strong hover:bg-card-hover",
        ghost: "text-muted hover:text-fg hover:bg-white/5",
        outline: "border border-border text-fg hover:border-primary/60 hover:text-accent",
        danger: "bg-loss/10 text-loss border border-loss/30 hover:bg-loss/20",
        profit: "bg-profit/10 text-profit border border-profit/30 hover:bg-profit/20",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
