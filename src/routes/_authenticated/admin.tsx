import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listClients } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Clientes — Brunet Asesores" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminList,
});

function AdminList() {
  const navigate = useNavigate();
  const router = useRouter();
  const fetchClients = useServerFn(listClients);
  const opts = useMemo(
    () =>
      queryOptions({
        queryKey: ["admin", "clients"],
        queryFn: () => fetchClients(),
      }),
    [fetchClients],
  );
  const { data, isLoading } = useQuery(opts);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    return data.filter(
      (c) =>
        c.display_name.toLowerCase().includes(needle) ||
        c.phone.toLowerCase().includes(needle),
    );
  }, [data, q]);

  async function signOut() {
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <span className="font-heading font-bold">B</span>
            </div>
            <div>
              <h1 className="font-heading text-base font-semibold">Panel de gestión</h1>
              <p className="text-xs text-muted-foreground">Brunet Asesores</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/admin/cuenta" className="text-muted-foreground hover:text-foreground">
              Cuenta
            </Link>
            <button
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold">Clientes</h2>
            <p className="text-sm text-muted-foreground">
              {data ? `${data.length} cliente${data.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <input
            type="search"
            placeholder="Buscar por nombre o teléfono"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-72"
          />
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {data && data.length === 0
              ? "Aún no hay clientes. En cuanto alguien suba un documento aparecerá aquí."
              : "No hay resultados."}
          </div>
        )}

        <ul className="grid gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to="/admin/cliente/$id"
                params={{ id: c.id }}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:bg-secondary"
              >
                <div>
                  <p className="font-medium text-foreground">{c.display_name}</p>
                  <p className="text-sm text-muted-foreground">{c.phone}</p>
                </div>
                <span className="text-primary">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
