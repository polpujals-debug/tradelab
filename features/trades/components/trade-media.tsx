"use client";
import { Loader2, Upload } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Gallery, type GalleryItem } from "@/components/shared/gallery";
import { ImagePicker } from "@/components/shared/image-picker";
import { NativeSelect } from "@/components/ui/input";
import { deleteMediaAction, uploadTradeMediaAction, type FormState } from "../actions";

export function TradeMedia({ tradeId, items }: { tradeId: string; items: GalleryItem[] }) {
  const [, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const kind = String(fd.get("kind") ?? "during");
    const files = fd.getAll("upload");
    const next = new FormData();
    files.forEach((f) => next.append(`media_${kind}`, f));
    const res = await uploadTradeMediaAction(tradeId, prev, next);
    if (res.ok) toast.success(res.message);
    else toast.error(res.message);
    return res;
  }, { ok: false });

  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <Gallery items={items} onDelete={(id) => deleteMediaAction(id, tradeId)} />
      ) : (
        <p className="text-sm text-dim">Encara no hi ha captures.</p>
      )}
      <form action={action} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border p-3">
        <ImagePicker name="upload" label="Afegir captures" hint="Arrossega, tria o enganxa (Ctrl+V)" pasteTarget />
        <div className="flex items-center gap-2">
          <NativeSelect name="kind" aria-label="Moment de la captura" className="h-9 w-28 text-xs" defaultValue="during">
            <option value="before">Abans</option>
            <option value="during">Durant</option>
            <option value="after">Després</option>
          </NativeSelect>
          <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Upload />} Pujar</Button>
        </div>
      </form>
    </div>
  );
}
