import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  DOCUMENT_CATEGORIES,
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  type DocumentCategory,
} from "@/lib/documents";

const STORAGE_KEY = "brunet_client_v1";

type Stored = { name: string; phone: string };

function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.name && parsed?.phone) return parsed;
  } catch {}
  return null;
}

function writeStored(v: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {}
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function currentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Enviar documentación — Brunet Asesores" },
      {
        name: "description",
        content:
          "Sube tus facturas, nóminas, recibos y extractos a Brunet Asesores en pocos segundos, sin registro.",
      },
      { property: "og:title", content: "Enviar documentación — Brunet Asesores" },
      {
        property: "og:description",
        content: "Envía tu documentación a tu asesoría de forma rápida y segura.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<Stored | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [month, setMonth] = useState(currentMonth());
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneChange, setPhoneChange] = useState<{
    show: boolean;
    newPhone: string;
  }>({ show: false, newPhone: "" });

  useEffect(() => {
    const s = readStored();
    if (s) {
      setStored(s);
      setName(s.name);
      setPhone(s.phone);
    }
  }, []);

  const identified = useMemo(() => stored != null, [stored]);

  function resetIdentity() {
    clearStored();
    setStored(null);
    setName("");
    setPhone("");
  }

  async function handlePhoneUpdate() {
    if (!stored) return;
    const newP = phoneChange.newPhone.trim();
    if (newP.length < 6) {
      toast.error("Introduce un teléfono válido");
      return;
    }
    const res = await fetch("/api/public/update-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPhone: stored.phone, newPhone: newP, name: stored.name }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? "No se pudo actualizar");
      return;
    }
    const next = { name: stored.name, phone: newP };
    writeStored(next);
    setStored(next);
    setPhone(newP);
    setPhoneChange({ show: false, newPhone: "" });
    toast.success("Teléfono actualizado. Tu carpeta se mantiene.");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Introduce tu nombre y teléfono");
      return;
    }
    if (!category) {
      toast.error("Selecciona el tipo de documento");
      return;
    }
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error("Formato no permitido. Solo PDF, JPG o PNG.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("El archivo supera los 20 MB");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      fd.append("category", category);
      fd.append("month", month);
      fd.append("file", file);
      const res = await fetch("/api/public/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir el archivo");
      writeStored({ name: name.trim(), phone: phone.trim() });
      setStored({ name: name.trim(), phone: phone.trim() });
      setFile(null);
      setCategory("");
      // Reset file input
      const input = document.getElementById("file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      toast.success("¡Documento enviado! Gracias.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto max-w-2xl px-5 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <span className="font-heading text-lg font-bold">B</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              Brunet Asesores
            </h1>
            <p className="text-xs text-muted-foreground">
              Envío de documentación
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {identified && (
            <div className="mb-5 rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">
              <p className="font-medium">Hola, {stored?.name}</p>
              <p className="mt-0.5 text-secondary-foreground/80">
                Teléfono: {stored?.phone}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={resetIdentity}
                  className="underline underline-offset-2 hover:text-primary-hover"
                >
                  No soy yo, cambiar datos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPhoneChange({ show: true, newPhone: stored?.phone ?? "" })
                  }
                  className="underline underline-offset-2 hover:text-primary-hover"
                >
                  He cambiado de teléfono
                </button>
              </div>
              {phoneChange.show && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phoneChange.newPhone}
                    onChange={(e) =>
                      setPhoneChange((p) => ({ ...p, newPhone: e.target.value }))
                    }
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    placeholder="Nuevo teléfono"
                  />
                  <button
                    type="button"
                    onClick={handlePhoneUpdate}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Actualizar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhoneChange({ show: false, newPhone: "" })}
                    className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          <h2 className="font-heading text-2xl font-semibold text-foreground">
            Envía tu documento
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rellena estos campos y adjunta el archivo. Nosotros lo organizamos.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {!identified && (
              <>
                <Field label="Nombre">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    placeholder="Tu nombre"
                    maxLength={200}
                  />
                </Field>
                <Field label="Teléfono">
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="600 000 000"
                    maxLength={40}
                  />
                </Field>
              </>
            )}

            <Field label="Tipo de documento">
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className={inputCls}
              >
                <option value="">Selecciona una opción…</option>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mes del documento">
              <input
                required
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Archivo (PDF, JPG o PNG · máx 20MB)">
              <input
                id="file-input"
                required
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-accent"
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Enviar documento"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate({ to: "/multi" })}
              className="text-sm text-primary underline underline-offset-4 hover:text-primary-hover"
            >
              Tengo varios archivos que subir
            </button>
          </div>
        </div>

        <footer className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© Brunet Asesores · Palma de Mallorca</span>
          <Link to="/auth" className="hover:text-foreground">
            Acceso asesora
          </Link>
        </footer>
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
