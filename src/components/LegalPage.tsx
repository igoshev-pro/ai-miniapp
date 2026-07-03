// src/components/LegalPage.tsx
'use client'

import { useState, useCallback } from 'react'
import {
  ArrowLeft, FileText, Shield, RefreshCcw, Building2,
  CreditCard, ChevronDown, ChevronUp, HelpCircle, ExternalLink,
} from 'lucide-react'
import { useTelegram } from '@/context/TelegramContext'
import { MERCHANT, SERVICE_NAME } from '@/config/legal'
import { SUPPORT_TG_LINK } from '@/config/const'

interface Props { onBack?: () => void }

type SectionId = 'offer' | 'privacy' | 'refund' | 'card' | 'requisites'

const PAY_LOGOS = [
  { src: '/payment/visa.png', alt: 'Visa' },
  { src: '/payment/mastercard.svg', alt: 'Mastercard' },
  { src: '/payment/elcart.png', alt: 'Элкарт' },
]

export function LegalPage({ onBack }: Props) {
  const { haptic, webApp } = useTelegram()
  const [open, setOpen] = useState<SectionId | null>('requisites')

  const toggle = useCallback((id: SectionId) => {
    haptic('light')
    setOpen((prev) => (prev === id ? null : id))
  }, [haptic])

  const openSupport = useCallback(() => {
    haptic('light')
    if (webApp?.openTelegramLink) webApp.openTelegramLink(SUPPORT_TG_LINK)
    else window.open(SUPPORT_TG_LINK, '_blank')
  }, [haptic, webApp])

  const Section = ({
    id, icon, title, children,
  }: {
    id: SectionId
    icon: React.ReactNode
    title: string
    children: React.ReactNode
  }) => {
    const isOpen = open === id
    return (
      <div className="rounded-[14px] bg-white/[.03] border border-white/[.06] overflow-hidden">
        <button
          onClick={() => toggle(id)}
          className="w-full flex items-center gap-2.5 px-3.5 py-3.5 text-left"
        >
          <span className="text-amber-400 shrink-0">{icon}</span>
          <span className="flex-1 text-[14px] font-semibold text-white/85">{title}</span>
          {isOpen
            ? <ChevronUp size={16} className="text-white/40" />
            : <ChevronDown size={16} className="text-white/40" />}
        </button>
        {isOpen && (
          <div className="px-3.5 pb-4 text-[12.5px] leading-[1.6] text-white/55 space-y-2 animate-fade-in">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative z-[1] px-4 pb-[100px]">
      {/* Header */}
      <div className="flex items-center gap-2 pt-4 pb-3 animate-fade-in">
        {onBack && (
          <button
            onClick={() => { haptic('light'); onBack() }}
            className="bg-white/[.06] border-none rounded-lg p-1.5 text-white/60 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="text-[18px] font-bold text-white">Документы и информация</div>
      </div>

      <div className="flex flex-col gap-2 animate-fade-in [animation-delay:.05s]">

        {/* Реквизиты ИП (п.5) */}
        <Section id="requisites" icon={<Building2 size={16} />} title="Реквизиты продавца">
          <p><strong className="text-white/75">{MERCHANT.name}</strong></p>
          <p>ИНН: {MERCHANT.inn}</p>
          <p>ОКПО: {MERCHANT.okpo}</p>
          <p>Рег. номер: {MERCHANT.regNumber} от {MERCHANT.regDate}</p>
          <p>Адрес: {MERCHANT.address}</p>
          <p>Вид деятельности: {MERCHANT.activity}</p>
          <p>
            Связь:{' '}
            <button onClick={openSupport} className="text-amber-400 underline">
              поддержка в Telegram
            </button>
          </p>
        </Section>

        {/* Оплата картой (п.6) */}
        <Section id="card" icon={<CreditCard size={16} />} title="Оплата банковской картой">
          <p>
            Оплата производится онлайн через защищённый платёжный шлюз FreedomPay.
            Принимаются карты Visa, Mastercard и Элкарт.
          </p>
          <p>
            После выбора пакета или тарифа вы будете перенаправлены на защищённую
            платёжную страницу, где нужно ввести данные карты. Соединение защищено
            протоколом TLS, данные карты не хранятся на наших серверах.
          </p>
          <p>
            Оплата производится в национальной валюте — кыргызских сомах (KGS).
            Зачисление спичек на баланс происходит автоматически после подтверждения платежа.
          </p>
          <div className="flex items-center gap-3 pt-1">
            {PAY_LOGOS.map((l) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={l.alt}
                src={l.src}
                alt={l.alt}
                className="h-6 w-auto opacity-90"
              />
            ))}
          </div>
        </Section>

        {/* Правила возврата (п.4) */}
        <Section id="refund" icon={<RefreshCcw size={16} />} title="Правила возврата средств">
          <p>
            Товаром является цифровая услуга — внутренняя валюта «спички» для доступа
            к сервисам генеративного ИИ.
          </p>
          <p>
            <strong className="text-white/75">1.</strong> Возврат неиспользованных
            спичек возможен в течение 14 календарных дней с момента покупки при условии,
            что они не были потрачены.
          </p>
          <p>
            <strong className="text-white/75">2.</strong> Частично использованный пакет
            подлежит возврату пропорционально остатку неиспользованных спичек.
          </p>
          <p>
            <strong className="text-white/75">3.</strong> Спички, потраченные на
            генерацию контента (текст, изображения, видео, аудио), возврату не подлежат,
            так как услуга считается оказанной.
          </p>
          <p>
            <strong className="text-white/75">4.</strong> Для оформления возврата
            обратитесь в поддержку. Возврат производится тем же способом оплаты в течение
            10 рабочих дней с момента подтверждения заявки.
          </p>
          <p>
            <button onClick={openSupport} className="text-amber-400 underline">
              Запросить возврат через поддержку
            </button>
          </p>
        </Section>

        {/* Публичная оферта (п.1) */}
        <Section id="offer" icon={<FileText size={16} />} title="Публичная оферта">
          <p>
            Настоящий документ является публичной офертой {MERCHANT.shortName}
            (далее — «Продавец») и определяет условия использования сервиса {SERVICE_NAME}.
          </p>
          <p>
            <strong className="text-white/75">1. Предмет.</strong> Продавец предоставляет
            Пользователю доступ к сервисам генеративного искусственного интеллекта
            посредством внутренней валюты «спички», приобретаемой Пользователем.
          </p>
          <p>
            <strong className="text-white/75">2. Акцепт.</strong> Оплата любого пакета
            спичек или тарифа означает полное и безоговорочное принятие условий настоящей оферты.
          </p>
          <p>
            <strong className="text-white/75">3. Цена и оплата.</strong> Стоимость услуг
            указана в кыргызских сомах (KGS). Оплата производится через платёжный шлюз
            FreedomPay.
          </p>
          <p>
            <strong className="text-white/75">4. Оказание услуги.</strong> Услуга считается
            оказанной с момента списания спичек за генерацию контента. Спички зачисляются
            на баланс автоматически после оплаты.
          </p>
          <p>
            <strong className="text-white/75">5. Ответственность.</strong> Продавец не несёт
            ответственности за содержание контента, сгенерированного нейросетями по запросу
            Пользователя. Пользователь обязуется не использовать сервис в противоправных целях.
          </p>
          <p>
            <strong className="text-white/75">6. Возврат.</strong> Осуществляется в порядке,
            описанном в разделе «Правила возврата средств».
          </p>
          <p>
            <strong className="text-white/75">7. Прочее.</strong> Оферта регулируется
            законодательством Кыргызской Республики. По всем вопросам — обращайтесь в поддержку.
          </p>
        </Section>

        {/* Политика конфиденциальности (п.1) */}
        <Section id="privacy" icon={<Shield size={16} />} title="Политика конфиденциальности">
          <p>
            {MERCHANT.shortName} обрабатывает персональные данные в соответствии с
            законодательством Кыргызской Республики о защите персональных данных.
          </p>
          <p>
            <strong className="text-white/75">1. Какие данные собираем.</strong> Идентификатор
            Telegram, имя пользователя, а также текст запросов, необходимых для работы сервиса.
          </p>
          <p>
            <strong className="text-white/75">2. Цели обработки.</strong> Предоставление доступа
            к сервису, начисление и списание спичек, техническая поддержка, обработка платежей.
          </p>
          <p>
            <strong className="text-white/75">3. Платёжные данные.</strong> Данные банковских
            карт обрабатываются исключительно платёжным провайдером FreedomPay и не хранятся
            на серверах Продавца.
          </p>
          <p>
            <strong className="text-white/75">4. Передача третьим лицам.</strong> Данные не
            передаются третьим лицам, кроме случаев, предусмотренных законодательством КР,
            и передачи платёжному провайдеру для проведения оплаты.
          </p>
          <p>
            <strong className="text-white/75">5. Права пользователя.</strong> Вы можете запросить
            удаление своих данных, обратившись в поддержку.
          </p>
        </Section>

        {/* Поддержка */}
        <button
          onClick={openSupport}
          className="flex items-center gap-2.5 px-3.5 py-3.5 rounded-[14px] bg-white/[.03] border border-white/[.06] text-white/70"
        >
          <HelpCircle size={16} className="text-amber-400" />
          <span className="flex-1 text-left text-[14px] font-semibold">Поддержка</span>
          <ExternalLink size={14} className="text-white/40" />
        </button>
      </div>

      {/* Футер с реквизитами */}
      <div className="text-center px-5 py-5 mt-2">
        <div className="text-[10px] text-white/[.2] leading-[1.5]">
          {MERCHANT.shortName} · ИНН {MERCHANT.inn}
        </div>
      </div>
    </div>
  )
}