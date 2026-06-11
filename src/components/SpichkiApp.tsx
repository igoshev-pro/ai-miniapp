'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useTelegram } from '@/context/TelegramContext'
import { useAuth, useModels, useUser } from '@/hooks'
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
import { TelegramLoginButton } from './auth/TelegramLoginButton'

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

export function SpichkiApp() {
  const { isReady, isTelegram, webApp } = useTelegram()
  const { isReady: authReady, loginWithWidget } = useAuth()
  const token = useAuthStore((s) => s.token)
  const { refetch: refetchUser } = useUser()
  const { loadModels } = useModels()

    // Ждём гидрацию persist-стора (иначе при F5 в браузере токен ещё null
  // в момент первого рендера → мигнёт экран логина)
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

  const navigateTo = useCallback(
    (newPage: Page) => {
      setPageHistory((prev) => [...prev, page])
      setPage(newPage)
    },
    [page],
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
      setChatModel(modelNameOrSlug || 'gpt-4o-mini')
      setChatId(
        existingChatId && existingChatId.length > 0 ? existingChatId : undefined,
      )
      navigateTo('chat')
      setActiveNav('create')
    },
    [navigateTo],
  )

  const openGeneration = useCallback(
    (type: 'image' | 'video' | 'audio', modelSlug?: string) => {
      setGenModel(modelSlug)
      navigateTo(`${type}-generation` as Page)
      setActiveNav('create')
    },
    [navigateTo],
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
      else if (target.startsWith('subscribe:')) navigateTo('subscription')
    },
    [navigateTo],
  )

  const handleNavChange = useCallback(
    (id: string) => {
      setPageHistory([])
      switch (id) {
        case 'models':
          setPage('all-models')
          setInitialCategory(null)
          setActiveNav('models')
          break
        case 'create':
          setChatId(undefined)
          setChatModel('ChatGPT 4o')
          setPage('chat')
          setActiveNav('create')
          break
        case 'favorites':
          setPage('favorites')
          setActiveNav('favorites')
          break
        case 'profile':
          setPage('profile')
          setActiveNav('profile')
          break
        case 'feed':
        default:
          goHome()
      }
    },
    [goHome],
  )

  const handleHomeRefresh = useCallback(async () => {
    await refetchUser()
  }, [refetchUser])

  // Если есть токен (из persist) — догружаем профиль и модели
  useEffect(() => {
    if (authReady && token) {
      refetchUser()
      loadModels()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, token])

  // ─────────────────────────────────────────────────────────────
  // 🆕 Единый глобальный контроллер Telegram BackButton.
  // Раньше каждая страница вешала свой onClick/offClick, из-за чего
  // при переходах handler'ы конфликтовали и кнопка "назад" умирала.
  // Теперь BackButton управляется ТОЛЬКО здесь, в одном месте.
  // ─────────────────────────────────────────────────────────────
  const goBackRef = useRef(goBack)
  useEffect(() => { goBackRef.current = goBack }, [goBack])

  useEffect(() => {
    const bb = webApp?.BackButton
    if (!bb) return

    const handler = () => {
      goBackRef.current()
    }

    bb.onClick(handler)

    return () => {
      bb.offClick(handler)
    }
  }, [webApp])

  // Показываем/прячем кнопку в зависимости от страницы
  useEffect(() => {
    const bb = webApp?.BackButton
    if (!bb) return
    if (page === 'home') {
      bb.hide()
    } else {
      bb.show()
    }
  }, [webApp, page])

  // 1) Ждём пока проинициализируется Telegram WebApp, гидрация persist и auth flow
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

  // 2) Не в Telegram + нет JWT → экран логина через Telegram Login Widget
  if (!isTelegram && !token) {
    return <TelegramLoginButton onAuth={loginWithWidget} />
  }

  // 3) Авторизован — основное приложение
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
        {page === 'topup' && <TopUpPage onBack={goBack} />}
        {page === 'transactions' && <TransactionsPage onBack={goBack} />}
        {page === 'subscription' && <SubscriptionPage onBack={goBack} />}
        {page === 'referral' && <ReferralPage onBack={goBack} />}
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
    </div>
  )
}
    