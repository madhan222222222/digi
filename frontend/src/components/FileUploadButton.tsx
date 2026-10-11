import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { apiUpload } from "@/lib/api";
import { apiErrorText } from "@/lib/errors";
import type { FileMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";

const ACCEPTS: Record<string, string> = {
  resume: ".pdf,.doc,.docx",
  offer_letter: ".pdf",
  document: ".pdf,.jpg,.jpeg,.png",
  supporting: ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  logo: ".png,.jpg,.jpeg,.webp",
};

export function FileUploadButton({
  category,
  onUploaded,
  children,
  variant = "outline",
  size = "sm",
  testId,
}: {
  category: keyof typeof ACCEPTS | string;
  onUploaded: (meta: FileMeta) => void;
  children: ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const meta = await apiUpload<FileMeta>(`/files?category=${encodeURIComponent(String(category))}`, fd);
      onUploaded(meta);
      toast.success(`${file.name} uploaded`);
    } catch (err) {
      toast.error(apiErrorText(err, "Upload failed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFile}
        accept={ACCEPTS[String(category)] ?? ".pdf"}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        data-testid={testId}
      >
        {busy ? "Uploading…" : children}
      </Button>
    </>
  );
}
