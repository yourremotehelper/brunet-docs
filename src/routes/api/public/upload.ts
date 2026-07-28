import { createFileRoute } from "@tanstack/react-router";
import { ALLOWED_MIME, MAX_FILE_BYTES, normalizePhone, type DocumentCategory } from "@/lib/documents";

const VALID_CATEGORIES: DocumentCategory[] = [
  "facturas_emitidas",
  "facturas_recibidas",
  "recibos",
  "nominas",
  "extractos_bancarios",
  "documentacion",
  "justificantes",
  "otros",
];

function sanitizeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "archivo";
}

function validateMonth(m: string): string {
  // Expect YYYY-MM
  const match = /^(\d{4})-(\d{2})$/.exec(m);
  if (!match) throw new Error("Mes inválido");
  return `${match[1]}-${match[2]}-01`;
}

async function upsertClient(
  admin: any,
  phoneNorm: string,
  displayName: string,
): Promise<string> {
  const { data: existing } = await admin
    .from("clients")
    .select("id, display_name")
    .eq("phone", phoneNorm)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: inserted, error } = await admin
    .from("clients")
    .insert({ phone: phoneNorm, display_name: displayName })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return inserted.id;
}

async function processOne(
  admin: any,
  clientId: string,
  file: File,
  category: DocumentCategory,
  monthDate: string,
) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.name}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Archivo demasiado grande (máx 20MB): ${file.name}`);
  }
  const monthKey = monthDate.slice(0, 7); // YYYY-MM
  const uid = crypto.randomUUID();
  const path = `${clientId}/${category}/${monthKey}/${uid}-${sanitizeName(file.name)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { error: dbErr } = await admin.from("documents").insert({
    client_id: clientId,
    category,
    month: monthDate,
    file_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (dbErr) throw new Error(dbErr.message);
}

export const Route = createFileRoute("/api/public/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const rawName = String(form.get("name") ?? "").trim();
          const rawPhone = String(form.get("phone") ?? "").trim();
          if (!rawName || rawName.length > 200) {
            return Response.json({ error: "Nombre inválido" }, { status: 400 });
          }
          const phoneNorm = normalizePhone(rawPhone);
          if (phoneNorm.length < 6 || phoneNorm.length > 20) {
            return Response.json({ error: "Teléfono inválido" }, { status: 400 });
          }

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const clientId = await upsertClient(supabaseAdmin, phoneNorm, rawName);

          // Items: JSON metadata array + file inputs "file_0", "file_1"...
          const itemsRaw = form.get("items");
          if (typeof itemsRaw === "string" && itemsRaw.length > 0) {
            const items = JSON.parse(itemsRaw) as Array<{
              category: string;
              month: string;
              key: string;
            }>;
            if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
              return Response.json({ error: "Cantidad de archivos inválida" }, { status: 400 });
            }
            for (const it of items) {
              if (!VALID_CATEGORIES.includes(it.category as DocumentCategory)) {
                return Response.json({ error: "Categoría inválida" }, { status: 400 });
              }
              const monthDate = validateMonth(it.month);
              const f = form.get(it.key);
              if (!(f instanceof File)) {
                return Response.json({ error: "Archivo faltante" }, { status: 400 });
              }
              await processOne(
                supabaseAdmin,
                clientId,
                f,
                it.category as DocumentCategory,
                monthDate,
              );
            }
          } else {
            const category = String(form.get("category") ?? "");
            const month = String(form.get("month") ?? "");
            const file = form.get("file");
            if (!VALID_CATEGORIES.includes(category as DocumentCategory)) {
              return Response.json({ error: "Categoría inválida" }, { status: 400 });
            }
            if (!(file instanceof File)) {
              return Response.json({ error: "Archivo faltante" }, { status: 400 });
            }
            const monthDate = validateMonth(month);
            await processOne(
              supabaseAdmin,
              clientId,
              file,
              category as DocumentCategory,
              monthDate,
            );
          }

          return Response.json({ ok: true, clientId });
        } catch (err) {
          console.error("[upload] error", err);
          const msg = err instanceof Error ? err.message : "Error";
          return Response.json({ error: msg }, { status: 400 });
        }
      },
    },
  },
});
