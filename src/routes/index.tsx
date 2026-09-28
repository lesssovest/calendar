import { createFileRoute } from "@tanstack/react-router";

import { PublicationCalendar } from "@/components/PublicationCalendar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Календарь публикаций рассылок" },
      {
        name: "description",
        content:
          "Интерактивный календарь бронирования дней для email-рассылок об обновлениях системы: статусы, заказчики, важные рассылки и выгрузка в Excel.",
      },
      { property: "og:title", content: "Календарь публикаций рассылок" },
      {
        property: "og:description",
        content:
          "Команды бронируют дни для рассылок, вы управляете расписанием и выгружаете календарь в Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicationCalendar,
});
