import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { DocumentCategory } from "./documents";

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("id, display_name, phone, created_at")
      .order("display_name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getClientDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string }) =>
    z.object({ clientId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [{ data: client, error: e1 }, { data: docs, error: e2 }] = await Promise.all([
      context.supabase
        .from("clients")
        .select("id, display_name, phone, created_at")
        .eq("id", data.clientId)
        .maybeSingle(),
      context.supabase
        .from("documents")
        .select("id, category, month, file_path, file_name, mime_type, size_bytes, uploaded_at")
        .eq("client_id", data.clientId)
        .order("month", { ascending: false })
        .order("uploaded_at", { ascending: false }),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (!client) throw new Error("Cliente no encontrado");
    return { client, documents: docs ?? [] };
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clientId: string; displayName: string; phone: string }) =>
    z
      .object({
        clientId: z.string().uuid(),
        displayName: z.string().trim().min(1).max(200),
        phone: z.string().trim().min(3).max(40),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({
        display_name: data.displayName,
        phone: data.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.clientId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { path: string }) =>
    z.object({ path: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("documents")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

export type ClientRow = {
  id: string;
  display_name: string;
  phone: string;
  created_at: string;
};

export type DocRow = {
  id: string;
  category: DocumentCategory;
  month: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
};
