import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-xl bg-[linear-gradient(90deg,#0f1524_0%,#172033_50%,#0f1524_100%)] bg-[length:200%_100%] animate-shimmer",
        className,
      )}
    />
  );
}
