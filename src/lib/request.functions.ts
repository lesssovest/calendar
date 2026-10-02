import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";

const requestSchema = z.object({
  publish_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20000),
  customer: z.string().trim().min(1).max(200),
  audience: z.string().trim().max(200),
  status: z.enum(["draft", "scheduled", "published"]),
  important: z.boolean(),
});

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] ?? char,
  );
}

const STATUS_LABELS = {
  draft: "Драфт",
  scheduled: "Отложена",
  published: "Опубликована",
} as const;

export const sendPublicationRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["RESEND_API_KEY"];
    const from = process.env["RESEND_FROM_EMAIL"];

    if (!apiKey) {
      throw new Error("Почтовый сервис не настроен: отсутствует RESEND_API_KEY.");
    }

    if (!from) {
      throw new Error("Почтовый сервис не настроен: отсутствует RESEND_FROM_EMAIL.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: ["kozak.asya05@gmail.com"],
        subject: `Заявка на публикацию: ${data.title}`,
        html: `
          <h2>Новая заявка на публикацию</h2>
          <p><strong>Дата публикации:</strong> ${escapeHtml(data.publish_date)}</p>
          <p><strong>Статус:</strong> ${escapeHtml(STATUS_LABELS[data.status])}</p>
          <p><strong>Название:</strong> ${escapeHtml(data.title)}</p>
          <p><strong>Заказчик:</strong> ${escapeHtml(data.customer)}</p>
          <p><strong>Целевая аудитория:</strong> ${escapeHtml(data.audience || "—")}</p>
          <p><strong>Важная рассылка:</strong> ${data.important ? "Да" : "Нет"}</p>
          <hr />
          <h3>Текст публикации</h3>
          <p>${escapeHtml(data.text).replace(/\n/g, "<br />")}</p>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Resend error:", body);
      throw new Error("Не удалось отправить заявку на почту.");
    }

    return { ok: true };
  });
