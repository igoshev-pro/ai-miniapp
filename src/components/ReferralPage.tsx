'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api'; // ⚠️ замени на свой путь к API client'у

interface ReferralData {
  referralCode: string;
  referralLink: string;
  botUsername: string;
  referralCount: number;
  activeReferrals: number;
  totalEarned: number;
  cashbackBalance: number;
  cashbackEarnedTotal: number;
  minWithdrawal: number;
  referrals: Array<{
    id: string;
    firstName: string;
    username: string | null;
    photoUrl: string | null;
    joinedAt: string;
    earned: number;
    hasPurchased: boolean;
  }>;
}

interface Withdrawal {
  id: string;
  amount: number;
  amountRub: number;
  method: 'card' | 'sbp' | 'crypto';
  requisites: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  adminNote: string;
  createdAt: string;
  processedAt: string | null;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: '⏳ В обработке', color: '#f59e0b' },
  approved: { text: '✅ Одобрено', color: '#3b82f6' },
  paid: { text: '💸 Выплачено', color: '#10b981' },
  rejected: { text: '❌ Отклонено', color: '#ef4444' },
};

const METHOD_LABELS: Record<string, string> = {
  card: '💳 Карта',
  sbp: '📱 СБП',
  crypto: '🪙 USDT TRC20',
};

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Форма вывода
  const [wdAmount, setWdAmount] = useState('');
  const [wdMethod, setWdMethod] = useState<'card' | 'sbp' | 'crypto'>('card');
  const [wdRequisites, setWdRequisites] = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdError, setWdError] = useState('');
  const [wdSuccess, setWdSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [infoRes, wdRes] = await Promise.all([
        apiClient.get('/referral/info'),
        apiClient.get('/referral/withdrawals'),
      ]);
      setData(infoRes.data.data);
      setWithdrawals(wdRes.data.data);
    } catch (e) {
      console.error('Failed to load referral data', e);
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareInTelegram() {
    if (!data) return;
    const text = encodeURIComponent(
      `🔥 Присоединяйся к Spichki AI! Получи 9 спичек на старте и доступ к нейросетям.`,
    );
    const url = encodeURIComponent(data.referralLink);
    const tg = (window as any).Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  }

  async function submitWithdrawal() {
    setWdError('');
    setWdSuccess('');

    const amount = parseInt(wdAmount, 10);
    if (!amount || amount < (data?.minWithdrawal || 100)) {
      setWdError(`Минимум ${data?.minWithdrawal || 100} спичек`);
      return;
    }
    if (amount > (data?.cashbackBalance || 0)) {
      setWdError('Недостаточно кэшбека на балансе');
      return;
    }
    if (wdRequisites.trim().length < 4) {
      setWdError('Укажите реквизиты');
      return;
    }

    try {
      setWdSubmitting(true);
      await apiClient.post('/referral/withdraw', {
        amount,
        method: wdMethod,
        requisites: wdRequisites.trim(),
      });
      setWdSuccess('✅ Заявка создана! Обработаем в течение 24 часов.');
      setWdAmount('');
      setWdRequisites('');

      // Перезагружаем данные
      setTimeout(() => {
        loadData();
        setShowWithdrawModal(false);
        setWdSuccess('');
      }, 1500);
    } catch (e: any) {
      setWdError(e?.response?.data?.message || 'Ошибка при создании заявки');
    } finally {
      setWdSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="ref-page">
        <div className="ref-loading">Загрузка...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ref-page">
        <div className="ref-loading">Не удалось загрузить данные</div>
      </div>
    );
  }

  return (
    <div className="ref-page">
      {/* Заголовок */}
      <div className="ref-header">
        <h1 className="ref-title">🤝 Приглашай друзей</h1>
        <p className="ref-subtitle">
          Получай <b>10 🔥</b> за каждого друга + <b>10%</b> кэшбек с его покупок
        </p>
      </div>

      {/* Реферальная ссылка */}
      <div className="ref-link-card">
        <div className="ref-link-label">Твоя ссылка</div>
        <div className="ref-link-value" onClick={copyLink}>
          {data.referralLink}
        </div>
        <div className="ref-link-actions">
          <button className="ref-btn ref-btn-primary" onClick={shareInTelegram}>
            📤 Поделиться
          </button>
          <button className="ref-btn ref-btn-secondary" onClick={copyLink}>
            {copied ? '✓ Скопировано' : '📋 Копировать'}
          </button>
        </div>
      </div>

      {/* Инструкция */}
      <div className="ref-instruction">
        <h3 className="ref-instruction-title">Как это работает</h3>
        <ol className="ref-instruction-list">
          <li>
            <span className="ref-step-num">1</span>
            <span>Скопируй или поделись своей ссылкой</span>
          </li>
          <li>
            <span className="ref-step-num">2</span>
            <span>Друг переходит и запускает бота</span>
          </li>
          <li>
            <span className="ref-step-num">3</span>
            <span>
              Он получает <b>9 🔥</b> на старте, ты — <b>10 🔥</b> мгновенно
            </span>
          </li>
          <li>
            <span className="ref-step-num">4</span>
            <span>
              С каждой его покупки тебе <b>10%</b> кэшбек на вывод или генерации
            </span>
          </li>
          <li>
            <span className="ref-step-num">5</span>
            <span>
              Выводи кэшбек на карту/СБП/крипту от {data.minWithdrawal} ₽
            </span>
          </li>
        </ol>
        <p className="ref-instruction-note">
          * 1 спичка кэшбека = 1 ₽ при выводе
        </p>
      </div>

      {/* Кэшбек и кнопка вывода */}
      <div className="ref-cashback-card">
        <div className="ref-cashback-header">
          <span className="ref-cashback-label">💰 Доступно к выводу</span>
          <span className="ref-cashback-total">
            Всего заработано: {data.cashbackEarnedTotal} 🔥
          </span>
        </div>
        <div className="ref-cashback-value">
          {data.cashbackBalance} <span className="ref-cashback-unit">🔥</span>
        </div>
        <div className="ref-cashback-actions">
          <button
            className="ref-btn ref-btn-primary"
            disabled={data.cashbackBalance < data.minWithdrawal}
            onClick={() => setShowWithdrawModal(true)}
          >
            💸 Вывести
          </button>
          <button
            className="ref-btn ref-btn-secondary"
            onClick={() => setShowHistoryModal(true)}
          >
            📜 История выводов
          </button>
        </div>
        {data.cashbackBalance < data.minWithdrawal && (
          <p className="ref-cashback-hint">
            Минимум для вывода: {data.minWithdrawal} 🔥
          </p>
        )}
      </div>

      {/* Статистика — 3 плитки */}
      <h3 className="ref-section-title">📊 Статистика</h3>
      <div className="ref-stats-grid">
        <div className="ref-stat-tile">
          <div className="ref-stat-icon">👥</div>
          <div className="ref-stat-value">{data.referralCount}</div>
          <div className="ref-stat-label">Друзей</div>
        </div>
        <div className="ref-stat-tile">
          <div className="ref-stat-icon">💎</div>
          <div className="ref-stat-value">{data.activeReferrals}</div>
          <div className="ref-stat-label">С покупками</div>
        </div>
        <div className="ref-stat-tile">
          <div className="ref-stat-icon">🔥</div>
          <div className="ref-stat-value">{data.cashbackBalance}</div>
          <div className="ref-stat-label">Кэшбек</div>
        </div>
      </div>

      {/* Список рефералов */}
      {data.referrals.length > 0 && (
        <>
          <h3 className="ref-section-title">👥 Приглашённые</h3>
          <div className="ref-list">
            {data.referrals.map((r) => (
              <div key={r.id} className="ref-list-item">
                <div className="ref-list-avatar">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt={r.firstName} />
                  ) : (
                    <span>{r.firstName?.[0] || '?'}</span>
                  )}
                </div>
                <div className="ref-list-info">
                  <div className="ref-list-name">{r.firstName}</div>
                  <div className="ref-list-meta">
                    {r.hasPurchased ? '💎 Активен' : '⏳ Без покупок'} ·{' '}
                    {new Date(r.joinedAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
                <div className="ref-list-earned">
                  +{r.earned} <span>🔥</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {data.referrals.length === 0 && (
        <div className="ref-empty">
          <p>Пока никого нет 🤷</p>
          <p className="ref-empty-hint">Поделись ссылкой — и тут появятся друзья</p>
        </div>
      )}

      {/* Модалка вывода */}
      {showWithdrawModal && (
        <div className="ref-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <h3>💸 Вывод средств</h3>
              <button
                className="ref-modal-close"
                onClick={() => setShowWithdrawModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="ref-modal-body">
              <div className="ref-form-row">
                <label>Сумма (🔥 = ₽)</label>
                <input
                  type="number"
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  placeholder={`От ${data.minWithdrawal}`}
                  min={data.minWithdrawal}
                  max={data.cashbackBalance}
                />
                <div className="ref-form-hint">
                  Доступно: {data.cashbackBalance} 🔥
                </div>
              </div>

              <div className="ref-form-row">
                <label>Способ получения</label>
                <div className="ref-method-tabs">
                  <button
                    className={wdMethod === 'card' ? 'active' : ''}
                    onClick={() => setWdMethod('card')}
                  >
                    💳 Карта
                  </button>
                  <button
                    className={wdMethod === 'sbp' ? 'active' : ''}
                    onClick={() => setWdMethod('sbp')}
                  >
                    📱 СБП
                  </button>
                  <button
                    className={wdMethod === 'crypto' ? 'active' : ''}
                    onClick={() => setWdMethod('crypto')}
                  >
                    🪙 USDT
                  </button>
                </div>
              </div>

              <div className="ref-form-row">
                <label>
                  {wdMethod === 'card' && 'Номер карты'}
                  {wdMethod === 'sbp' && 'Номер телефона'}
                  {wdMethod === 'crypto' && 'Адрес TRC20 кошелька'}
                </label>
                <input
                  type="text"
                  value={wdRequisites}
                  onChange={(e) => setWdRequisites(e.target.value)}
                  placeholder={
                    wdMethod === 'card'
                      ? '0000 0000 0000 0000'
                      : wdMethod === 'sbp'
                      ? '+7 900 000 00 00'
                      : 'T...'
                  }
                />
              </div>

              {wdError && <div className="ref-form-error">{wdError}</div>}
              {wdSuccess && <div className="ref-form-success">{wdSuccess}</div>}
            </div>

            <div className="ref-modal-footer">
              <button
                className="ref-btn ref-btn-secondary"
                onClick={() => setShowWithdrawModal(false)}
                disabled={wdSubmitting}
              >
                Отмена
              </button>
              <button
                className="ref-btn ref-btn-primary"
                onClick={submitWithdrawal}
                disabled={wdSubmitting}
              >
                {wdSubmitting ? 'Отправка...' : 'Создать заявку'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка истории */}
      {showHistoryModal && (
        <div className="ref-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="ref-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <h3>📜 История выводов</h3>
              <button
                className="ref-modal-close"
                onClick={() => setShowHistoryModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="ref-modal-body">
              {withdrawals.length === 0 ? (
                <div className="ref-empty">
                  <p>Заявок пока нет</p>
                </div>
              ) : (
                <div className="ref-wd-list">
                  {withdrawals.map((w) => {
                    const st = STATUS_LABELS[w.status];
                    return (
                      <div key={w.id} className="ref-wd-item">
                        <div className="ref-wd-row">
                          <span className="ref-wd-amount">{w.amount} 🔥</span>
                          <span
                            className="ref-wd-status"
                            style={{ color: st.color }}
                          >
                            {st.text}
                          </span>
                        </div>
                        <div className="ref-wd-meta">
                          {METHOD_LABELS[w.method]} · {w.requisites}
                        </div>
                        <div className="ref-wd-date">
                          {new Date(w.createdAt).toLocaleString('ru-RU')}
                        </div>
                        {w.adminNote && (
                          <div className="ref-wd-note">💬 {w.adminNote}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}