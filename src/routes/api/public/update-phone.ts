import { createFileRoute } from "@tanstack/react-router";
import { normalizePhone } from "@/lib/documents";

export const Route = createFileRoute("/api/public/update-phone")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            oldPhone?: string;
            newPhone?: string;
            name?: string;
          };
          const oldP = normalizePhone(body.oldPhone ?? "");
          const newP = normalizePhone(body.newPhone ?? "");
          const name = (body.name ?? "").toString().trim();
          if (oldP.length < 6 || newP.length < 6 || !name) {
            return Response.json({ error: "Datos inválidos" }, { status: 400 });
          }
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data: existing } = await supabaseAdmin
            .from("clients")
            .select("id")
            .eq("phone", oldP)
            .maybeSingle();
          if (!existing) {
            // Nothing to update — treat as no-op success
            return Response.json({ ok: true, updated: false });
          }
          const { error } = await supabaseAdmin
            .from("clients")
            .update({
              phone: newP,
              display_name: name,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          return Response.json({ ok: true, updated: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Error";
          return Response.json({ error: msg }, { status: 400 });
        }
      },
    },
  },
});
