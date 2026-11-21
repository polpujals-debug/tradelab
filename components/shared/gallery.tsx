"use client";
import { ExternalLink, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useState, useTransition } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  id: string;
  url: string;
  thumb: string | null;
  caption?: string | null;
  label?: string;
}

export function Gallery({ items, onDelete, className, large = false }: { items: GalleryItem[]; onDelete?: (id: string) => Promise<unknown>; className?: string; large?: boolean }) {
  const [open, setOpen] = useState<GalleryItem | null>(null);
  const [zoom, setZoom] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <div className={cn("grid gap-3", large ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3", className)}>
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setOpen(m); setZoom(false); }}
            className="group relative overflow-hidden rounded-xl border border-border bg-bg text-left transition-all hover:border-primary/50 hover:shadow-glow cursor-zoom-in"
          >
            <img src={large ? m.url : (m.thumb ?? m.url)} alt={m.caption ?? m.label ?? "Captura"} loading="lazy" className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
            {(m.label || m.caption) && (
              <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-fg backdrop-blur">
                {m.label ?? m.caption}
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent title={open.caption ?? open.label ?? "Captura"} className="max-w-[min(1400px,96vw)] p-4 sm:p-5">
            <div className={cn("overflow-auto rounded-xl border border-border bg-bg", zoom ? "max-h-[78dvh]" : "")}>
              <img
                src={open.url}
                alt={open.caption ?? "Captura"}
                onClick={() => setZoom((z) => !z)}
                className={cn("mx-auto transition-all", zoom ? "max-w-none w-[200%] cursor-zoom-out" : "max-h-[75dvh] w-full object-contain cursor-zoom-in")}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <button type="button" onClick={() => setZoom((z) => !z)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted hover:text-fg cursor-pointer">
                {zoom ? <ZoomOut className="size-3.5" /> : <ZoomIn className="size-3.5" />} {zoom ? "Allunyar" : "Ampliar"}
              </button>
              <a href={open.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-muted hover:text-fg">
                <ExternalLink className="size-3.5" /> Original
              </a>
              {onDelete && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Eliminar aquesta captura?")) return;
                    const target = open;
                    start(async () => { await onDelete(target.id); setOpen(null); });
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-loss/30 px-2.5 py-1.5 text-loss hover:bg-loss/10 cursor-pointer"
                >
                  <Trash2 className="size-3.5" /> Eliminar
                </button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
