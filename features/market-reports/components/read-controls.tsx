"use client";
import { CheckCheck, Mail, MailOpen } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllReadAction, setReportReadAction } from "../actions";

/** Marca l'informe com a llegit en obrir-lo (un sol cop) i permet desmarcar-lo. */
export function ReadToggle({ id, isRead }: { id: string; isRead: boolean }) {
  const [pending, start] = useTransition();
  const done = useRef(false);
  useEffect(() => {
    if (!isRead && !done.current) {
      done.current = true;
      void setReportReadAction(id, true);
    }
  }, [id, isRead]);
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => { await setReportReadAction(id, false); toast.success("Marcat com a no llegit"); })}>
      {isRead ? <Mail /> : <MailOpen />} Marcar com a no llegit
    </Button>
  );
}

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" disabled={pending} onClick={() => start(async () => { await markAllReadAction(); toast.success("Tots marcats com a llegits"); })}>
      <CheckCheck /> Marcar-los tots com a llegits
    </Button>
  );
}
