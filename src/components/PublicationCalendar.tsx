import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { PublicationForm, type FormValues } from "@/components/PublicationForm";
import { PublicationRequestForm } from "@/components/PublicationRequestForm";
import {
  MONTHS,
  STATUS_LABELS,
  WEEKDAYS,
  audienceConflicts,
  buildMonthGrid,
  exportToExcel,
  isDiscouraged,
  isWeekend,
  toISODate,
} from "@/lib/calendar-utils";
import {
  checkCode,
  createPublication,
  deletePublication,
  listPublications,
  movePublication,
  updatePublication,
  type Publication,
} from "@/lib/publications.functions";

const STATUS_STYLES: Record<Publication["status"], string> = {
  draft: "bg-secondary text-muted-foreground",
  scheduled: "bg-sand text-sand-foreground",
  published: "bg-mint text-mint-foreground",
};

const CODE_KEY = "calendar-editor-code";

export function PublicationCalendar() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [editor, setEditor] = useState<{ date: string; publication: Publication | null } | null>(
    null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Publication | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const queryClient = useQueryClient();
  const { data: publications = [], isLoading } = useQuery({
    queryKey: ["publications"],
    queryFn: () => listPublications(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["publications"] });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues & { id?: string | undefined }) => {
      const payload = { ...values, code: code ?? "" };
      if (values.id) await updatePublication({ data: { ...payload, id: values.id } });
      else await createPublication({ data: payload });
    },
    onSuccess: invalidate,
  });

  const moveMutation = useMutation({
    mutationFn: (vars: { id: string; publish_date: string }) =>
      movePublication({ data: { ...vars, code: code ?? "" } }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePublication({ data: { id, code: code ?? "" } }),
    onSuccess: invalidate,
  });

  const grid = buildMonthGrid(cursor.year, cursor.month);
  const conflicts = audienceConflicts(publications);
  const byDate = useMemo(() => {
    const map = new Map<string, Publication[]>();
    for (const item of publications) {
      const list = map.get(item.publish_date) ?? [];
      list.push(item);
      map.set(item.publish_date, list);
    }
    return map;
  }, [publications]);

  const monthItems = publications.filter((p) => {
    const [y, m] = p.publish_date.split("-").map(Number);
    return y === cursor.year && m === cursor.month + 1;
  });

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  async function unlock() {
    setCodeError(null);
    try {
      const result = await checkCode({ data: { code: codeInput.trim() } });
      if (!result.ok) {
        setCodeError(
          result.reason === "not_configured"
            ? "Код редактирования не настроен на сервере"
            : "Неверный код",
        );
        return;
      }

      setCode(codeInput.trim());
      sessionStorage.setItem(CODE_KEY, codeInput.trim());
      setShowCodeBox(false);
      setCodeInput("");
    } catch (error) {
      console.error("Editor code check failed:", error);
      setCodeError("Не удалось проверить код. Обновите страницу и попробуйте снова.");
    }
  }

  // Восстанавливаем режим редактирования после перезагрузки страницы.
  useEffect(() => {
    const stored = sessionStorage.getItem(CODE_KEY);
    if (stored) setCode(stored);
  }, []);


  const canEdit = Boolean(code);

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-mint/70 via-peach/30 to-transparent" />
      <div className="relative mx-auto max-w-[1180px] px-4 py-8 sm:px-8">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Календарь публикаций
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Бронирование дней для рассылок об обновлениях системы
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void exportToExcel(publications)}
              className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Выгрузить в Excel
            </button>
            <button
              onClick={() => setShowRequestForm(true)}
              className="rounded-lg border border-primary/40 bg-card px-3.5 py-2 text-sm font-semibold text-primary transition hover:bg-accent"
            >
              Подать заявку на публикацию
            </button>
            {canEdit ? (
              <span className="rounded-lg bg-mint px-3.5 py-2 text-sm font-semibold text-mint-foreground">
                Режим редактирования
              </span>
            ) : (
              <button
                onClick={() => setShowCodeBox((v) => !v)}
                className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Редактировать
              </button>
            )}
          </div>
        </header>

        {showCodeBox && !canEdit && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
            <input
              type="password"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void unlock()}
              placeholder="Код редактирования"
              className="w-56 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => void unlock()}
              className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground"
            >
              Войти
            </button>
            {codeError && <span className="text-sm text-destructive">{codeError}</span>}
          </div>
        )}

        <section className="rounded-3xl border border-border/70 bg-card p-4 shadow-[0_18px_48px_-32px_oklch(0.27_0.055_262/0.35)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                aria-label="Предыдущий месяц"
                className="size-9 rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
              >
                ‹
              </button>
              <button
                onClick={() => shiftMonth(1)}
                aria-label="Следующий месяц"
                className="size-9 rounded-lg border border-border text-muted-foreground transition hover:bg-muted"
              >
                ›
              </button>
              <h2 className="ml-1 text-lg font-bold text-foreground">
                {MONTHS[cursor.month]} {cursor.year}
              </h2>
            </div>
            <div className="hidden gap-4 text-xs text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-full bg-secondary" /> Драфт
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-full bg-sand" /> Отложена
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2.5 rounded-full bg-primary/70" /> Опубликована
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-semibold text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((day) => {
              const iso = toISODate(day);
              const items = byDate.get(iso) ?? [];
              const inMonth = day.getMonth() === cursor.month;
              const isToday = iso === toISODate(today);
              const discouraged = isDiscouraged(day);
              return (
                <div
                  key={iso}
                  onDragOver={(e) => {
                    if (canEdit && dragId) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (canEdit && dragId) {
                      moveMutation.mutate({ id: dragId, publish_date: iso });
                      setDragId(null);
                    }
                  }}
                  className={[
                    "min-h-28 rounded-xl border p-2 transition",
                    inMonth ? "border-border/70" : "border-transparent opacity-45",
                    discouraged ? "bg-blush/35" : isWeekend(day) ? "bg-muted/60" : "bg-surface",
                    isToday ? "ring-2 ring-primary/50" : "",
                  ].join(" ")}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${isToday ? "text-primary" : "text-foreground/70"}`}
                    >
                      {day.getDate()}
                    </span>
                    {canEdit && inMonth && (
                      <button
                        onClick={() => setEditor({ date: iso, publication: null })}
                        title="Добавить публикацию"
                        className="size-5 rounded-md text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
                      >
                        +
                      </button>
                    )}
                  </div>
                  {discouraged && items.length === 0 && inMonth && (
                    <p className="text-[10px] leading-tight text-blush-foreground/80">
                      не лучший день
                    </p>
                  )}
                  <div className="space-y-1">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        draggable={canEdit}
                        onDragStart={() => setDragId(item.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() =>
                          canEdit ? setEditor({ date: iso, publication: item }) : setSelected(item)
                        }
                        className={`block w-full rounded-lg px-2 py-1.5 text-left text-[11px] leading-tight transition hover:brightness-[0.97] ${STATUS_STYLES[item.status]} ${conflicts.has(item.id) ? "ring-1 ring-destructive/60" : ""}`}
                      >
                        <span className="line-clamp-2 font-semibold">
                          {item.important && "★ "}
                          {item.title}
                        </span>
                        <span className="mt-0.5 block truncate opacity-75">{item.customer}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs text-muted-foreground">Публикаций в этом месяце</p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">{monthItems.length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs text-muted-foreground">Важных</p>
            <p className="mt-1 text-2xl font-extrabold text-foreground">
              {monthItems.filter((p) => p.important).length}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs text-muted-foreground">Пересечений аудитории</p>
            <p className="mt-1 text-2xl font-extrabold text-destructive">
              {monthItems.filter((p) => conflicts.has(p.id)).length}
            </p>
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Понедельник и пятница подсвечены — в эти дни рассылки лучше не планировать. Если в один
          день попадают рассылки с одинаковой целевой аудиторией, они помечаются красной рамкой.
          {canEdit && " Публикацию можно перенести перетаскиванием на другой день."}
        </p>
        {isLoading && <p className="mt-2 text-xs text-muted-foreground">Загружаем данные…</p>}
      </div>

      {showRequestForm && (
        <Modal title="Заявка на публикацию" onClose={() => setShowRequestForm(false)}>
          <PublicationRequestForm
            initialDate={toISODate(today)}
            onClose={() => setShowRequestForm(false)}
          />
        </Modal>
      )}

      {editor && (
        <Modal
          title={editor.publication ? "Публикация" : "Новая публикация"}
          onClose={() => setEditor(null)}
        >
          <PublicationForm
            initialDate={editor.date}
            publication={editor.publication}
            onCancel={() => setEditor(null)}
            onSubmit={async (values) => {
              await saveMutation.mutateAsync({ ...values, id: editor.publication?.id });
              setEditor(null);
            }}
            onDelete={
              editor.publication
                ? async () => {
                    await deleteMutation.mutateAsync(editor.publication!.id);
                    setEditor(null);
                  }
                : undefined
            }
          />
        </Modal>
      )}

      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <dl className="space-y-3 text-sm">
            <Row label="Дата" value={selected.publish_date} />
            <Row label="Заказчик" value={selected.customer} />
            <Row label="Целевая аудитория" value={selected.audience || "—"} />
            <Row label="Статус" value={STATUS_LABELS[selected.status]} />
            <Row label="Важная" value={selected.important ? "да" : "нет"} />
            <Row label="Описание" value={selected.description || "—"} />
          </dl>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/25 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="size-8 rounded-lg text-muted-foreground transition hover:bg-muted"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
