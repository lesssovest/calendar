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

function normalizeAdminCode(value: string) {
  return value.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}

function assertCode(code: string) {
  const expected = process.env["CALENDAR_ADMIN_CODE"];
  if (!expected) throw new Error("Код редактирования не настроен");
  if (normalizeAdminCode(code) !== normalizeAdminCode(expected)) {
    throw new Error("Неверный код редактирования");
  }
}

function publicationWriteError(message: string): never {
  if (message.includes("publications_date_audience_unique_idx") || message.includes("duplicate key value")) {
    throw new Error("На эту дату уже запланирована рассылка для этой целевой аудитории. Выберите другой день или аудиторию.");
  }
  throw new Error(message);
}

async function db() {
  const { sql } = await import("@/integrations/neon/client.server");
  return sql;
}

export const listPublications = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  const rows = await sql`
    SELECT id::text, publish_date::text, title, description, customer, audience, status::text, important
    FROM publications
    ORDER BY publish_date ASC, created_at ASC
  `;
  return rows as Publication[];
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
    const sql = await db();
    try {
      await sql`
        INSERT INTO publications
          (publish_date, title, description, customer, audience, status, important)
        VALUES
          (${data.publish_date}, ${data.title.trim()}, ${data.description || null},
           ${data.customer.trim()}, ${data.audience?.trim() || null}, ${data.status}, ${data.important})
      `;
    } catch (error) {
      publicationWriteError(error instanceof Error ? error.message : String(error));
    }
    return { ok: true };
  });

export const updatePublication = createServerFn({ method: "POST" })
  .inputValidator((d) => payloadSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const sql = await db();
    try {
      await sql`
        UPDATE publications
        SET publish_date = ${data.publish_date},
            title = ${data.title.trim()},
            description = ${data.description || null},
            customer = ${data.customer.trim()},
            audience = ${data.audience?.trim() || null},
            status = ${data.status},
            important = ${data.important},
            updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } catch (error) {
      publicationWriteError(error instanceof Error ? error.message : String(error));
    }
    return { ok: true };
  });

export const movePublication = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      code: z.string().min(1),
      id: z.string().uuid(),
      publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    assertCode(data.code);
    const sql = await db();
    try {
      await sql`
        UPDATE publications
        SET publish_date = ${data.publish_date}, updated_at = now()
        WHERE id = ${data.id}::uuid
      `;
    } catch (error) {
      publicationWriteError(error instanceof Error ? error.message : String(error));
    }
    return { ok: true };
  });

export const deletePublication = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().min(1), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const sql = await db();
    await sql`DELETE FROM publications WHERE id = ${data.id}::uuid`;
    return { ok: true };
  });
