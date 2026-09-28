import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicationStatus = "draft" | "scheduled" | "published";

export type Publication = {
  id: string;
  publish_date: string;
  title: string;
  description: string | null;
  customer: string;
  audience: string | null;
  status: PublicationStatus;
  important: boolean;
};

const payloadSchema = z.object({
  code: z.string().min(1),
  publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  customer: z.string().trim().min(1).max(200),
  audience: z.string().max(200).optional().default(""),
  status: z.enum(["draft", "scheduled", "published"]),
  important: z.boolean(),
});

function assertCode(code: string) {
  const expected = process.env["CALENDAR_ADMIN_CODE"];
  if (!expected) throw new Error("Код редактирования не настроен");
  if (code !== expected) throw new Error("Неверный код редактирования");
}

function publicationWriteError(message: string): never {
  // PostgreSQL unique_violation from the date/audience index.
  if (message.includes("publications_date_audience_unique_idx") || message.includes("duplicate key value")) {
    throw new Error("На эту дату уже запланирована рассылка для этой целевой аудитории. Выберите другой день или аудиторию.");
  }
  throw new Error(message);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listPublications = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data, error } = await db
    .from("publications")
    .select("id, publish_date, title, description, customer, audience, status, important")
    .order("publish_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Publication[];
});

export const checkCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    return { ok: true };
  });

export const createPublication = createServerFn({ method: "POST" })
  .inputValidator((d) => payloadSchema.parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const db = await admin();
    const { code: _code, ...row } = data;
    const { error } = await db.from("publications").insert(row);
    if (error) publicationWriteError(error.message);
    return { ok: true };
  });

export const updatePublication = createServerFn({ method: "POST" })
  .inputValidator((d) => payloadSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const db = await admin();
    const { code: _code, id, ...row } = data;
    const { error } = await db.from("publications").update(row).eq("id", id);
    if (error) publicationWriteError(error.message);
    return { ok: true };
  });

export const movePublication = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().min(1),
        id: z.string().uuid(),
        publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertCode(data.code);
    const db = await admin();
    const { error } = await db
      .from("publications")
      .update({ publish_date: data.publish_date })
      .eq("id", data.id);
    if (error) publicationWriteError(error.message);
    return { ok: true };
  });

export const deletePublication = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const db = await admin();
    const { error } = await db.from("publications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
