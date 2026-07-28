export type DocumentCategory =
  | "facturas_emitidas"
  | "facturas_recibidas"
  | "recibos"
  | "nominas"
  | "extractos_bancarios"
  | "documentacion"
  | "justificantes"
  | "otros";

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: "facturas_emitidas", label: "Facturas emitidas" },
  { value: "facturas_recibidas", label: "Facturas recibidas" },
  { value: "recibos", label: "Recibos" },
  { value: "nominas", label: "Nóminas" },
  { value: "extractos_bancarios", label: "Extractos bancarios" },
  { value: "documentacion", label: "Documentación" },
  { value: "justificantes", label: "Justificantes" },
  { value: "otros", label: "Otros" },
];

export const CATEGORY_LABEL: Record<DocumentCategory, string> =
  DOCUMENT_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.value] = c.label;
      return acc;
    },
    {} as Record<DocumentCategory, string>,
  );

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabel(monthIso: string): string {
  // monthIso: "YYYY-MM-01"
  const [y, m] = monthIso.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "").trim();
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);
