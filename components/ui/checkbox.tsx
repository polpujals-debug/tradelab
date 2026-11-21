"use client";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn("flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border-strong bg-surface transition-colors data-[state=checked]:border-profit data-[state=checked]:bg-profit/20", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="size-3.5 text-profit" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
