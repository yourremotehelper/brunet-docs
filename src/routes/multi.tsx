import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  DOCUMENT_CATEGORIES,
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  type DocumentCategory,
} from "@/lib/documents";

const STORAGE_KEY = "brunet_client_v1";

type Row = {
  key: string;
  file: File;
  category: DocumentCategory | "";
  month: string;
};

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/multi")({
  head: () => ({
    meta: [
      { title: "Enviar varios archivos — Brunet Asesores" },
      {
        name: "description",
        content: "Sube varios documentos a la vez a Brunet Asesores.",
      },
      { property: "og:title", content: "Enviar varios archivos — Brunet Asesores" },
      {
        property: "og:description",
        content: "Sube todos tus documentos de una vez, cada uno con su categoría.",
      },
    ],
  }),
  component: MultiUploadPage,
});

function MultiUploadPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.name) setName(p.name);
        if (p?.phone) setPhone(p.phone);
      }
    } catch {}
  }, []);

  function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const nowMonth = currentMonth();
    const existingCat = rows.find((r) => r.category)?.category ?? "";
    const newRows: Row[] = Array.from(files).map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      file: f,
      category: existingCat,
      month: nowMonth,
    }));
    setRows((prev) => [...prev, ...newRows]);
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      const wasEmpty = next[idx].category === "";
      next[idx] = { ...next[idx], ...patch };
      // If first category filled, propagate to empty rows
      if (patch.category && wasEmpty) {
        const cat = patch.category;
        const noneHadBefore = prev.every(
          (r, i) => i === idx || r.category === "" || r.category === cat,
        );
        if (noneHadBefore) {
          for (let i = 0; i < next.length; i++) {
            if (i !== idx && next[i].category === "") {
              next[i] = { ...next[i], category: cat };
            }
          }
        }
      }
      return next;
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Introduce nombre y teléfono");
      return;
    }
    if (rows.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }
    for (const r of rows) {
      if (!r.category) {
        toast.error(`Falta el tipo de "${r.file.name}"`);
        return;
      }
      if (!ALLOWED_MIME.has(r.file.type)) {
        toast.error(`Formato no permitido: ${r.file.name}`);
        return;
      }
      if (r.file.size > MAX_FILE_BYTES) {
        toast.error(`Archivo demasiado grande (máx 20MB): ${r.file.name}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      const items = rows.map((r, i) => {
        const key = `file_${i}`;
        fd.append(key, r.file);
        return { category: r.category, month: r.month, key };
      });
      fd.append("items", JSON.stringify(items));
      const res = await fetch("/api/public/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Error al subir");
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ name: name.trim(), phone: phone.trim() }),
        );
      } catch {}
      toast.success(`${rows.length} documentos enviados. ¡Gracias!`);
      setRows([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-3xl px-5 pt-10 pb-6">
        <Link to="/" className="text-sm text-primary hover:text-primary-hover">
          ← Volver
        </Link>
        <h1 className="mt-4 font-heading text-2xl font-semibold text-foreground">
          Enviar varios archivos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube todos tus documentos de una vez. Elige el tipo y el mes de cada uno.
        </p>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16">
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Nombre</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                maxLength={200}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Teléfono</span>
              <input
                required
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                maxLength={40}
              />
            </label>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Archivos</span>
              <input
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => onFilesSelected(e.target.files)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-accent"
              />
            </label>
          </div>

          {rows.length > 0 && (
            <ul className="mt-5 space-y-3">
              {rows.map((r, i) => (
                <li
                  key={r.key}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {r.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(r.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <select
                      value={r.category}
                      onChange={(e) =>
                        updateRow(i, { category: e.target.value as DocumentCategory })
                      }
                      className={inputCls}
                    >
                      <option value="">Tipo de documento…</option>
                      {DOCUMENT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="month"
                      value={r.month}
                      onChange={(e) => updateRow(i, { month: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={submitting || rows.length === 0}
            className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? "Enviando…" : `Enviar ${rows.length || ""} archivo${rows.length === 1 ? "" : "s"}`}
          </button>
        </form>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
