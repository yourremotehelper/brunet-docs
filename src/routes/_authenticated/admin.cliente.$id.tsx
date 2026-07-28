import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  getClientDetail,
  updateClient,
  getSignedUrl,
} from "@/lib/admin.functions";
import { CATEGORY_LABEL, monthLabel, type DocumentCategory } from "@/lib/documents";

export const Route = createFileRoute("/_authenticated/admin/cliente/$id")({
  head: () => ({
    meta: [
      { title: "Cliente — Brunet Asesores" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getClientDetail);
  const doUpdate = useServerFn(updateClient);
  const doSign = useServerFn(getSignedUrl);

  const opts = useMemo(
    () =>
      queryOptions({
        queryKey: ["admin", "client", id],
        queryFn: () => fetchDetail({ data: { clientId: id } }),
      }),
    [fetchDetail, id],
  );
  const { data, isLoading } = useQuery(opts);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function openEdit() {
    if (!data) return;
    setName(data.client.display_name);
    setPhone(data.client.phone);
    setEditing(true);
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    try {
      await doUpdate({
        data: { clientId: id, displayName: name.trim(), phone: phone.trim() },
      });
      toast.success("Cliente actualizado");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["admin", "client", id] });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  }

  async function openFile(path: string) {
    try {
      const { url } = await doSign({ data: { path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir");
    }
  }

  type Doc = NonNullable<typeof data>["documents"][number];

  const grouped = useMemo(() => {
    if (!data) return [] as Array<{
      category: DocumentCategory;
      months: Array<{ month: string; docs: Doc[] }>;
    }>;
    const byCat = new Map<DocumentCategory, Map<string, Doc[]>>();
    for (const d of data.documents) {
      const cat = d.category as DocumentCategory;
      if (!byCat.has(cat)) byCat.set(cat, new Map());
      const monthMap = byCat.get(cat)!;
      const key = d.month;
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(d);
    }
    return Array.from(byCat.entries()).map(([category, monthMap]) => ({
      category,
      months: Array.from(monthMap.entries())
        .sort((a, b) => (a[0] < b[0] ? 1 : -1))
        .map(([month, docs]) => ({ month, docs })),
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-5 py-4">
          <Link to="/admin" className="text-sm text-primary hover:text-primary-hover">
            ← Todos los clientes
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {data && (
          <>
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h1 className="font-heading text-3xl font-semibold">
                  {data.client.display_name}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.client.phone} · {data.documents.length} documento
                  {data.documents.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                onClick={openEdit}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                Editar cliente
              </button>
            </div>

            {editing && (
              <form
                onSubmit={saveEdit}
                className="mb-6 rounded-xl border border-border bg-card p-5"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Nombre visible</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Teléfono</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </label>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {grouped.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Este cliente aún no ha enviado documentos.
              </div>
            )}

            <div className="space-y-8">
              {grouped.map(({ category, months }) => (
                <section key={category}>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    {CATEGORY_LABEL[category]}
                  </h2>
                  <div className="mt-3 space-y-4">
                    {months.map(({ month, docs }) => (
                      <div
                        key={month}
                        className="rounded-xl border border-border bg-card p-4"
                      >
                        <p className="text-sm font-medium text-secondary-foreground">
                          {monthLabel(month)}
                        </p>
                        <ul className="mt-2 divide-y divide-border">
                          {docs.map((d) => (
                            <li
                              key={d.id}
                              className="flex items-center justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm text-foreground">
                                  {d.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(d.size_bytes / 1024).toFixed(0)} KB ·{" "}
                                  {new Date(d.uploaded_at).toLocaleDateString("es-ES")}
                                </p>
                              </div>
                              <button
                                onClick={() => openFile(d.file_path)}
                                className="shrink-0 text-sm font-medium text-primary hover:text-primary-hover"
                              >
                                Abrir
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
