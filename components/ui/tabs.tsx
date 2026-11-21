"use client";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn("inline-flex items-center gap-1 rounded-xl border border-border bg-surface/80 p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-fg data-[state=active]:bg-primary/15 data-[state=active]:text-accent data-[state=active]:shadow-[inset_0_0_0_1px_rgb(59_130_246/0.35)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
