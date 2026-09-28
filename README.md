# Update Scheduler

Календарь публикаций обновлений системы. Несколько публикаций в один день разрешены, но одна и та же целевая аудитория не может быть забронирована дважды на одну дату. Понедельник и пятница отмечаются как нежелательные дни.

## Хранение данных

Публикации хранятся в отдельной PostgreSQL-базе **Neon**, а не в Lovable Cloud/Supabase. Серверное приложение подключается к базе через переменную окружения `NEON_DATABASE_URL`.

Схема базы находится в `db/schema.sql`. Она создаёт таблицу `publications`, индекс по дате и уникальное ограничение для пары «дата + целевая аудитория».

Для редактора также требуется серверная переменная `CALENDAR_ADMIN_CODE`.

### Переменные окружения

```env
NEON_DATABASE_URL=postgresql://...
CALENDAR_ADMIN_CODE=...
```

`NEON_DATABASE_URL` и `CALENDAR_ADMIN_CODE` нельзя коммитить в публичный репозиторий.

## Первоначальная настройка Neon

1. Создайте PostgreSQL database в Neon.
2. Выполните содержимое `db/schema.sql` в SQL Editor.
3. Добавьте `NEON_DATABASE_URL` в Secrets/environment variables вашего деплоя.
4. Добавьте туда же `CALENDAR_ADMIN_CODE`.
5. Опубликуйте новую версию приложения.

**Важно:** текущая версия кода переключает новые чтения и записи на Neon, но существующие записи из старого Lovable Cloud/Supabase автоматически не копируются. Для сохранения старых записей их нужно один раз экспортировать из старой базы и импортировать в Neon.

## Vercel

Для Vercel используется `npm install` и `npm run build`. Не используйте старые Vercel deployments, созданные до исправления зависимостей: они могут ссылаться на старый commit с несуществующей версией Radix.

## Development

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Проверки:

```sh
npm run typecheck
npm run lint
npm run build
```
