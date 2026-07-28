import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/setup-admin")({
  server: {
    handlers: {
      POST: async () => {
        const email = "your.remote.helper@gmail.com";
        const password = "Contraseña2026!";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 200,
        });
        if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });

        const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (existing) {
          const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
            email_confirm: true,
          });
          if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
          return new Response(JSON.stringify({ ok: true, updated: true, id: existing.id }));
        }

        const { data: created, error: crErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (crErr) return new Response(JSON.stringify({ error: crErr.message }), { status: 500 });
        return new Response(JSON.stringify({ ok: true, created: true, id: created.user?.id }));
      },
    },
  },
});
