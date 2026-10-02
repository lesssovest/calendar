import { useState } from "react";

import { STATUS_LABELS } from "@/lib/calendar-utils";
import type { PublicationStatus } from "@/lib/publications.functions";
import { sendPublicationRequest } from "@/lib/request.functions";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

type RequestValues = {
  publish_date: string;
  title: string;
  text: string;
  customer: string;
  audience: string;
  status: PublicationStatus;
  important: boolean;
};

export function PublicationRequestForm({
  initialDate,
  onClose,
}: {
  initialDate: string;
  onClose: () => void;
}) {
  const [values, setValues] = useState<RequestValues>({
    publish_date: initialDate,
    title: "",
    text: "",
    customer: "",
    audience: "",
    status: "draft",
    important: false,
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof RequestValues>(key: K, value: RequestValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.customer.trim() || !values.text.trim()) {
      setError("Заполните дату, название, заказчика и текст публикации.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await sendPublicationRequest({ data: values });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить заявку.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-5 py-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-mint text-xl">
          ✓
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground">Заявка отправлена</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Заявка отправлена на проверку. После обработки публикация появится в календаре.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          Закрыть
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void submit(e)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Дата публикации</span>
          <input
            type="date"
            className={inputClass}
            value={values.publish_date}
            onChange={(e) => set("publish_date", e.target.value)}
            required
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Статус</span>
          <select
            className={inputClass}
            value={values.status}
            onChange={(e) => set("status", e.target.value as PublicationStatus)}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Название</span>
        <input
          className={inputClass}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Название публикации"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Текст публикации</span>
        <textarea
          className={`${inputClass} min-h-40 resize-y`}
          value={values.text}
          onChange={(e) => set("text", e.target.value)}
          placeholder="Полный текст публикации"
          required
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Заказчик</span>
          <input
            className={inputClass}
            value={values.customer}
            onChange={(e) => set("customer", e.target.value)}
            placeholder="Команда / ФИО"
            required
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Целевая аудитория</span>
          <input
            className={inputClass}
            value={values.audience}
            onChange={(e) => set("audience", e.target.value)}
            placeholder="Например: риск-менеджеры"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-blush/60 px-3 py-2.5">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={values.important}
          onChange={(e) => set("important", e.target.checked)}
        />
        <span className="text-sm font-medium text-blush-foreground">Важная рассылка</span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Отправляем…" : "Отправить заявку"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
