import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-white/[0.03] text-muted",
        primary: "border-primary/30 bg-primary/10 text-accent",
        cyan: "border-cyan/30 bg-cyan/10 text-cyan",
        profit: "border-profit/30 bg-profit/10 text-profit",
        loss: "border-loss/30 bg-loss/10 text-loss",
        warning: "border-warning/30 bg-warning/10 text-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
