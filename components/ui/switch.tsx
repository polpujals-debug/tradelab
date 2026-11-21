"use client";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-surface transition-colors data-[state=checked]:border-primary/60 data-[state=checked]:bg-primary/30", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-accent" />
    </SwitchPrimitive.Root>
  );
}
