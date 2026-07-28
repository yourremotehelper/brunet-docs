import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateOwnAccount } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin_.cuenta")({
  head: () => ({
    meta: [
      { title: "Cuenta — Brunet Asesores" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const update = useServerFn(updateOwnAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const wantsPass = password.length > 0 || password2.length > 0;
    if (wantsPass && password !== password2) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    if (wantsPass && password.length < 8) {
      setErr("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!email && !wantsPass) {
      setErr("Introduce un nuevo correo o una nueva contraseña.");
      return;
    }
    setBusy(true);
    try {
      await update({
        data: {
          email: email || undefined,
          password: wantsPass ? password : undefined,
        },
      });
      setMsg("Datos actualizados. Vuelve a iniciar sesión.");
      setEmail("");
      setPassword("");
      setPassword2("");
      await supabase.auth.signOut();
      router.invalidate();
      setTimeout(() => navigate({ to: "/auth" }), 1200);
    } catch (e: any) {
      setErr(e?.message ?? "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div>
            <h1 className="font-heading text-base font-semibold">Cuenta</h1>
            <p className="text-xs text-muted-foreground">Brunet Asesores</p>
          </div>
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h2 className="font-heading text-2xl font-semibold">Cambiar correo o contraseña</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cambia el correo de acceso cuando Montse asuma esta cuenta, o actualiza la contraseña.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Nuevo correo</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="montse@brunetasesores.com"
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Repetir contraseña</span>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2"
            />
          </label>

          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-primary">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-md px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </main>
    </div>
  );
}
