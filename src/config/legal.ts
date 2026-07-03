// src/config/legal.ts
// Юридические данные ИП (Кыргызская Республика) + курс сома.
// Используется в LegalPage, TopUpPage, SubscriptionPage и боте.
// ⚠️ Только для отображения. Логику биллинга не затрагивает.

/** Курс: 1 KGS (сом) = 0.88 RUB → сом = rub / KGS_RATE */
export const KGS_RATE = 0.9

/** RUB → KGS (сом), с округлением */
export function rubToKgs(rub: number): number {
  return Math.round(rub / KGS_RATE)
}

/** Форматирование суммы в сомах */
export function fmtKgs(rub: number): string {
  return rubToKgs(rub).toLocaleString('ru-RU')
}

/** Реквизиты ИП (КР) */
export const MERCHANT = {
  name: 'Индивидуальный предприниматель ЖЫЛДЫЗБЕК УУЛУ СЫЙМЫКБЕК',
  shortName: 'ИП Жылдызбек уулу Сыймыкбек',
  inn: '20111199701766',
  okpo: '34297158',
  regNumber: '012-2025-169-2267',
  regDate: '15.10.2025',
  address:
    'Кыргызская Республика, Чуйская обл., Сокулукский р-н, с. Кожомкул, ул. Рассвет, дом 36',
  activity:
    'Розничная дистанционная торговля через сеть Интернет (доступ к сервисам генеративного ИИ)',
} as const

/** Название сервиса */
export const SERVICE_NAME = 'Spichki AI'