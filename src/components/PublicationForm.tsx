import { useEffect, useState } from "react";

import { STATUS_LABELS } from "@/lib/calendar-utils";
import type { Publication, PublicationStatus } from "@/lib/publications.functions";

export type FormValues = {
  publish_date: string;
  title: string;
  description: string;
  customer: string;
  audience: string;
  status: PublicationStatus;
  important: boolean;
};

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

export function PublicationForm({
  initialDate,
  publication,
  onCancel,
  onSubmit,
  onDelete,
}: {
  initialDate: string;
  publication: Publication | null;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>({
    publish_date: publication?.publish_date ?? initialDate,
    title: publication?.title ?? "",
    description: publication?.description ?? "",
    customer: publication?.customer ?? "",
    audience: publication?.audience ?? "",
    status: publication?.status ?? "draft",
    important: publication?.important ?? false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues({
      publish_date: publication?.publish_date ?? initialDate,
      title: publication?.title ?? "",
      description: publication?.description ?? "",
      customer: publication?.customer ?? "",
      audience: publication?.audience ?? "",
      status: publication?.status ?? "draft",
      important: publication?.important ?? false,
    });
  }, [publication, initialDate]);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.title.trim() || !values.customer.trim()) {
          setError("Заполните название и заказчика");
          return;
        }
        void run(() => onSubmit(values));
      }}
    >
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
          placeholder="Обновление модуля рисков"
          required
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Краткое описание</span>
        <textarea
          className={`${inputClass} min-h-20 resize-y`}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Что именно анонсируем"
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

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {publication ? "Сохранить" : "Забронировать день"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
        >
          Отмена
        </button>
        {publication && onDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(onDelete)}
            className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            Удалить
          </button>
        )}
      </div>
    </form>
  );
}
