import { z } from "zod";

/** Una imatge pot arribar en base64, com a URL pública o com a id d'una pujada prèvia (/api/v1/uploads). */
export const imageInputSchema = z
  .object({
    base64: z.string().min(16).optional(),
    url: z.url().optional(),
    media_id: z.uuid().optional(),
    caption: z.string().trim().max(200).optional(),
  })
  .refine((i) => [i.base64, i.url, i.media_id].filter(Boolean).length === 1, { error: "Cada imatge necessita exactament un de: base64, url o media_id" });
export type ImageInput = z.infer<typeof imageInputSchema>;
