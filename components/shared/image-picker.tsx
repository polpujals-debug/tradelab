"use client";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ["image/png", "image/jpeg", "image/webp"];

/** Redueix a ≤ 2560 px i converteix a WebP al navegador (per no superar el límit de 4,5 MB de Vercel). */
async function compress(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

interface Preview {
  file: File;
  url: string;
}

export function ImagePicker({ name, label, hint, pasteTarget = false }: { name: string; label: string; hint?: string; pasteTarget?: boolean }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Preview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sincronitza els fitxers seleccionats amb l'<input> real perquè viatgin amb el formulari
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    items.forEach((i) => dt.items.add(i.file));
    inputRef.current.files = dt.files;
  }, [items]);

  // Allibera les URL de previsualització en desmuntar
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const add = async (files: File[]) => {
    setError(null);
    const valid = files.filter((f) => ACCEPT.includes(f.type));
    if (valid.length !== files.length) setError("Només PNG, JPG o WebP.");
    const tooBig = valid.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} supera els 10 MB.`);
      return;
    }
    setBusy(true);
    const compressed = await Promise.all(valid.map(compress));
    setBusy(false);
    setItems((prev) => [...prev, ...compressed.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  useEffect(() => {
    if (!pasteTarget) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        void add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <div key={item.url} className="group relative size-24 overflow-hidden rounded-xl border border-border">
            <img src={item.url} alt={`Captura ${idx + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(item.url);
                setItems((prev) => prev.filter((_, i) => i !== idx));
              }}
              className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              aria-label="Treure la captura"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <label
          htmlFor={id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void add(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-dim transition-colors hover:border-primary/60 hover:text-accent",
            busy && "animate-pulse",
          )}
        >
          <ImagePlus className="size-5" />
          <span className="text-[10px]">{busy ? "Processant…" : "Afegir"}</span>
        </label>
      </div>
      {/* input visible només per a lectors de pantalla; els fitxers es gestionen amb l'estat */}
      <input
        id={id}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void add(files);
        }}
      />
      <input ref={inputRef} type="file" name={name} multiple hidden tabIndex={-1} aria-hidden />
      {error ? <p className="mt-1 text-xs text-loss">{error}</p> : hint ? <p className="mt-1 text-xs text-dim">{hint}</p> : null}
    </div>
  );
}
