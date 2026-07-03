// src/components/SpichkiApp.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTelegram } from '@/context/TelegramContext'
import { useModels, useUser } from '@/hooks'
import { useAuthStore } from '@/stores'
import { StickyHeader } from './StickyHeader'
import { Background } from './Background'
import { ActionCards } from './ActionCards'
import { Categories } from './Categories'
import { ChatFeed } from './ChatFeed'
import { BottomNav } from './BottomNav'
import { DesktopSidebar } from './DesktopSidebar'
import { AllModelsPage } from './AllModelsPage'
import { ChatPage } from './ChatPage'
import { ImageGenerationPage } from './ImageGenerationPage'
import { VideoGenerationPage } from './VideoGenerationPage'
import { AudioGenerationPage } from './AudioGenerationPage'
import { ChatsHistoryPage } from './ChatsHistoryPage'
import { ProfilePage } from './ProfilePage'
import { TopUpPage } from './TopUpPage'
import { TransactionsPage } from './TransactionsPage'
import { SubscriptionPage } from './SubscriptionPage'
import ReferralPage from './ReferralPage'
import { FavoritesPage } from './FavoritesPage'
import { OfflineBanner } from './ui/OfflineBanner'
import { PullToRefresh } from './ui/PullToRefresh'
import { BotLoginButton } from './auth/BotLoginButton'
import { useAuth } from '@/hooks'
import { LegalPage } from './LegalPage'

type Page =
  | 'home'
  | 'all-models'
  | 'chat'
  | 'image-generation'
  | 'video-generation'
  | 'audio-generation'
  | 'chats-history'
  | 'profile'
  | 'topup'
  | 'transactions'
  | 'subscription'
  | 'referral'
  | 'favorites'
  | 'support'
  | 'legal'

// ─── Страницы, требующие авторизации ───
const AUTH_REQUIRED_PAGES: Set<Page> = new Set([
  'chat',
  'image-generation',
  'video-generation',
  'audio-generation',
  'profile',
  'topup',
  'transactions',
  'subscription',
  'referral',
  'chats-history',
  'favorites',
])

// 🆕 Страницы, доступные через start_param без авторизации
const VALID_START_PAGES: Set<Page> = new Set([
  'legal',
  'topup',
  'subscription',
])

export function SpichkiApp() {
  const { isReady, isTelegram, webApp } = useTelegram()
  const { isReady: authReady } = useAuth()
  const token = useAuthStore((s) => s.token)
  const { refetch: refetchUser } = useUser()
  const { loadModels } = useModels()

  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist?.hasHydrated() ?? true,
  )

  useEffect(() => {
    if (hydrated) return
    const unsub = useAuthStore.persist?.onFinishHydration(() =>
      setHydrated(true),
    )
    if (useAuthStore.persist?.hasHydrated()) setHydrated(true)
    return unsub
  }, [hydrated])

  const [activeNav, setActiveNav] = useState('feed')
  const [page, setPage] = useState<Page>('home')
  const [pageHistory, setPageHistory] = useState<Page[]>([])
  const [initialCategory, setInitialCategory] = useState<string | null>(null)
  const [chatModel, setChatModel] = useState<string>('ChatGPT 4o')
  const [chatId, setChatId] = useState<string | undefined>(undefined)
  const [genModel, setGenModel] = useState<string | undefined>(undefined)

  // ─── Auth Gate: модалка «Войди для продолжения» ───
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)

  const requireAuth = useCallback(
    (targetPage: Page, action: () => void): boolean => {
      if (!AUTH_REQUIRED_PAGES.has(targetPage)) {
        action()
        return true
      }
      if (token) {
        action()
        return true
      }
      setPendingNav(() => action)
      setShowAuthModal(true)
      return false
    },
    [token],
  )

  useEffect(() => {
    if (token && pendingNav && showAuthModal) {
      setShowAuthModal(false)
      pendingNav()
      setPendingNav(null)
    }
  }, [token, pendingNav, showAuthModal])

  const navigateTo = useCallback(
    (newPage: Page) => {
      requireAuth(newPage, () => {
        setPageHistory((prev) => [...prev, page])
        setPage(newPage)
      })
    },
    [page, requireAuth],
  )

  const goBack = useCallback(() => {
    setPageHistory((h) => {
      const prev = h[h.length - 1]
      if (prev) {
        setPage(prev)
        return h.slice(0, -1)
      }
      setPage('home')
      setActiveNav('feed')
      return []
    })
  }, [])

  const goHome = useCallback(() => {
    setPage('home')
    setPageHistory([])
    setInitialCategory(null)
    setChatId(undefined)
    setGenModel(undefined)
    setActiveNav('feed')
  }, [])

  const openAllModels = useCallback(
    (category?: string | null) => {
      setInitialCategory(category ?? null)
      navigateTo('all-models')
      setActiveNav('models')
    },
    [navigateTo],
  )

  const openChat = useCallback(
    (modelNameOrSlug?: string, existingChatId?: string) => {
      requireAuth('chat', () => {
        setChatModel(modelNameOrSlug || 'gpt-4o-mini')
        setChatId(
          existingChatId && existingChatId.length > 0 ? existingChatId : undefined,
        )
        setPageHistory((prev) => [...prev, page])
        setPage('chat')
        setActiveNav('create')
      })
    },
    [requireAuth, page],
  )

  const openGeneration = useCallback(
    (type: 'image' | 'video' | 'audio', modelSlug?: string) => {
      const targetPage = `${type}-generation` as Page
      requireAuth(targetPage, () => {
        setGenModel(modelSlug)
        setPageHistory((prev) => [...prev, page])
        setPage(targetPage)
        setActiveNav('create')
      })
    },
    [requireAuth, page],
  )

  const openChatsHistory = useCallback(() => {
    navigateTo('chats-history')
    setActiveNav('chats')
  }, [navigateTo])

  const handleActionNavigate = useCallback(
    (target: string) => {
      if (target === 'topup') navigateTo('topup')
      else if (target === 'subscription') navigateTo('subscription')
      else if (target === 'referral') navigateTo('referral')
    },
    [navigateTo],
  )

  const handleProfileNavigate = useCallback(
    (target: string) => {
      if (target === 'topup') navigateTo('topup')
      else if (target === 'transactions') navigateTo('transactions')
      else if (target === 'subscription') navigateTo('subscription')
      else if (target === 'referral') navigateTo('referral')
      else if (target === 'legal') navigateTo('legal')
      else if (target.startsWith('subscribe:')) navigateTo('subscription')
    },
    [navigateTo],
  )

  const handleNavChange = useCallback(
    (id: string) => {
      const pageMap: Record<string, Page> = {
        models: 'all-models',
        create: 'chat',
        favorites: 'favorites',
        profile: 'profile',
        topup: 'topup',
      }

      const targetPage = pageMap[id]

      if (!targetPage || id === 'feed') {
        goHome()
        return
      }

      requireAuth(targetPage, () => {
        setPageHistory([])

        if (id === 'create') {
          setChatId(undefined)
          setChatModel('ChatGPT 4o')
        }

        setPage(targetPage)
        if (id !== 'topup') {
          setActiveNav(id)
        }
      })
    },
    [goHome, requireAuth],
  )

  const handleHomeRefresh = useCallback(async () => {
    await refetchUser()
  }, [refetchUser])

  // ─── Если есть токен — догружаем профиль и модели ───
  useEffect(() => {
    if (authReady && token) {
      refetchUser()
      loadModels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, token])

  // ─── Загружаем модели даже без авторизации (для каталога) ───
  useEffect(() => {
    if (authReady && !token) {
      loadModels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, token])

  // 🆕 ─── Авто-навигация из start_param / URL ?page=xxx ───────────
  // Срабатывает один раз после полной инициализации.
  // Читаем: 1) Telegram startParam  2) location.search  3) location.hash
  // legal — открывается без авторизации.
  // topup / subscription — требуют токен (requireAuth покажет модалку).
  const startNavDone = useRef(false)

  useEffect(() => {
    // Ждём полной инициализации и выполняем только один раз
    if (!isReady || !authReady || !hydrated) return
    if (startNavDone.current) return
    startNavDone.current = true

    // 1) Telegram WebApp startParam (передаётся через ?startapp= или tgWebAppStartParam)
    const tgParam: string =
      (webApp as any)?.initDataUnsafe?.start_param ?? ''

    // 2) URL query string (?page=legal)
    let urlParam = ''
    try {
      const sp = new URLSearchParams(window.location.search)
      urlParam = sp.get('page') ?? ''
      // 3) Hash fallback (#page=legal)
      if (!urlParam && window.location.hash) {
        const hsp = new URLSearchParams(
          window.location.hash.replace(/^#\/?/, ''),
        )
        urlParam = hsp.get('page') ?? ''
      }
    } catch {
      // SSR или нестандартная среда — игнорируем
    }

    // Приоритет: tgParam > urlParam
    const raw = tgParam || urlParam

    if (!raw) return

    // Парсим: поддерживаем «page_legal», «legal», «page=legal»
    const normalized = raw
      .replace(/^page[=_]/, '') // убираем префикс page_ или page=
      .trim()
      .toLowerCase() as Page

    if (!VALID_START_PAGES.has(normalized)) return

    // Навигируем (requireAuth покажет модалку если нужна авторизация)
    requireAuth(normalized, () => {
      setPageHistory(['home'])
      setPage(normalized)
    })
  }, [isReady, authReady, hydrated, webApp, requireAuth])
  // ────────────────────────────────────────────────────────────────

  // ─── Telegram BackButton (единый контроллер) ───
  const goBackRef = useRef(goBack)
  useEffect(() => {
    goBackRef.current = goBack
  }, [goBack])

  useEffect(() => {
    const bb = webApp?.BackButton
    if (!bb) return
    const handler = () => goBackRef.current()
    bb.onClick(handler)
    return () => bb.offClick(handler)
  }, [webApp])

  useEffect(() => {
    const bb = webApp?.BackButton
    if (!bb) return
    if (page === 'home') bb.hide()
    else bb.show()
  }, [webApp, page])

  // 1) Ждём инициализацию
  if (!isReady || !authReady || !hydrated) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">🔥</div>
        <div className="app-loading__text">SPICHKI AI</div>
        <div className="app-loading__bar">
          <div className="app-loading__bar-fill" />
        </div>
      </div>
    )
  }

  // 2) Основное приложение — ВСЕГДА рендерится (даже без токена)
  return (
    <div className="app-layout">
      <Background />
      <DesktopSidebar active={activeNav} onChange={handleNavChange} />

      <div className="app-layout__main">
        <StickyHeader />
        <OfflineBanner />

        {page === 'home' && (
          <PullToRefresh onRefresh={handleHomeRefresh}>
            <div className="content">
              <ActionCards onNavigate={handleActionNavigate} />
              <Categories
                onViewAll={() => openAllModels()}
                onCategoryTap={(categoryId) => openAllModels(categoryId)}
              />
              <ChatFeed
                onChatTap={(model, id) => openChat(model, id)}
                onViewAll={openChatsHistory}
              />
            </div>
          </PullToRefresh>
        )}

        {page === 'all-models' && (
          <AllModelsPage
            onBack={goBack}
            initialCategory={initialCategory}
            onModelTap={(modelName, category) => {
              if (
                category === 'image' ||
                category === 'video' ||
                category === 'audio'
              ) {
                openGeneration(category, modelName)
              } else {
                openChat(modelName)
              }
            }}
          />
        )}

        {page === 'chat' && (
          <ChatPage
            key={chatId || chatModel}
            initialModel={chatModel}
            chatId={chatId}
            onBack={goBack}
          />
        )}

        {page === 'image-generation' && (
          <ImageGenerationPage
            key={genModel || 'default-image'}
            initialModel={genModel}
            onBack={goBack}
          />
        )}
        {page === 'video-generation' && (
          <VideoGenerationPage
            key={genModel || 'default-video'}
            initialModel={genModel}
            onBack={goBack}
          />
        )}
        {page === 'audio-generation' && (
          <AudioGenerationPage
            key={genModel || 'default-audio'}
            initialModel={genModel}
            onBack={goBack}
          />
        )}
        {page === 'chats-history' && (
          <ChatsHistoryPage onChatTap={(model, id) => openChat(model, id)} />
        )}
        {page === 'profile' && (
          <ProfilePage onNavigate={handleProfileNavigate} />
        )}
        {page === 'topup' && (
          <TopUpPage onBack={goBack} onNavigate={handleProfileNavigate} />
        )}
        {page === 'transactions' && <TransactionsPage onBack={goBack} />}
        {page === 'subscription' && <SubscriptionPage onBack={goBack} />}
        {page === 'referral' && <ReferralPage onBack={goBack} />}
        {page === 'legal' && <LegalPage onBack={goBack} />}
        {page === 'favorites' && (
          <FavoritesPage
            onBack={goBack}
            onOpenChat={(modelSlug, id) => openChat(modelSlug, id)}
            onOpenGeneration={(type) =>
              openGeneration(type as 'image' | 'video' | 'audio')
            }
          />
        )}

        <BottomNav active={activeNav} onChange={handleNavChange} />
      </div>

      {/* ─── Auth Modal ─── */}
      {showAuthModal && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAuthModal(false)
              setPendingNav(null)
            }}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{
                background: 'rgba(18, 18, 22, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="mb-3 text-4xl">🔐</div>
              <h2 className="mb-2 text-lg font-bold text-white">
                Требуется авторизация
              </h2>
              <p className="mb-5 text-sm text-white/60">
                Войди через Telegram, чтобы использовать генерацию, чаты, пополнение и другие функции
              </p>

              <BotLoginButton />

              <button
                onClick={() => {
                  setShowAuthModal(false)
                  setPendingNav(null)
                }}
                className="mt-4 text-sm text-white/40 hover:text-white/60 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}