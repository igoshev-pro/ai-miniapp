// src/components/SpichkiApp.tsx

'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTelegram } from '@/context/TelegramContext'
import { useAuth, useModels, useUser } from '@/hooks'
import { useAuthStore } from '@/stores'
import { StickyHeader } from './StickyHeader'
import { Background } from './Background'
import { ActionCards } from './ActionCards'
import { Categories } from './Categories'
import { ChatFeed } from './ChatFeed'
import { BottomNav } from './BottomNav'
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
import { ReferralPage } from './ReferralPage'
import { FavoritesPage } from './FavoritesPage'
import { SupportPage } from './SupportPage'
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
  const { isReady, isTelegram } = useTelegram()
  const { isReady: authReady, loginWithWidget } = useAuth()
  const { refetch: refetchUser } = useUser()
  const { loadModels } = useModels()
  const token = useAuthStore((s) => s.token)

  const [activeNav, setActiveNav] = useState('feed')
  const [page, setPage] = useState<Page>('home')
  const [pageHistory, setPageHistory] = useState<Page[]>([])
  const [initialCategory, setInitialCategory] = useState<string | null>(null)
  const [chatModel, setChatModel] = useState<string>('ChatGPT 4o')
  const [chatId, setChatId] = useState<string | undefined>(undefined)

  const navigateTo = useCallback(
    (newPage: Page) => {
      setPageHistory((prev) => [...prev, page])
      setPage(newPage)
    },
    [page],
  )

  const goBack = useCallback(() => {
    const prev = pageHistory[pageHistory.length - 1]
    if (prev) {
      setPageHistory((h) => h.slice(0, -1))
      setPage(prev)
    } else {
      setPage('home')
      setActiveNav('feed')
    }
  }, [pageHistory])

  const goHome = useCallback(() => {
    setPage('home')
    setPageHistory([])
    setInitialCategory(null)
    setChatId(undefined)
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
      setChatId(existingChatId && existingChatId.length > 0 ? existingChatId : undefined)
      navigateTo('chat')
      setActiveNav('create')
    },
    [navigateTo],
  )

  useEffect(() => {
    if (authReady) {
      loadModels()
    }
  }, [authReady, loadModels])

  const openGeneration = useCallback(
    (type: 'image' | 'video' | 'audio') => {
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
      if (id === 'models') {
        setPage('all-models')
        setInitialCategory(null)
        setActiveNav('models')
      } else if (id === 'create') {
        setChatId(undefined)
        setChatModel('ChatGPT 4o')
        setPage('chat')
        setActiveNav('create')
      } else if (id === 'favorites') {
        setPage('favorites')
        setActiveNav('favorites')
      } else if (id === 'profile') {
        setPage('profile')
        setActiveNav('profile')
      } else if (id === 'feed') {
        goHome()
      }
    },
    [goHome],
  )

  const handleHomeRefresh = useCallback(async () => {
    await refetchUser()
  }, [refetchUser])

  // ─── Loading state ────────────────────────────────────────────
  if (!isReady || !authReady) {
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

  // ─── Not in Telegram & not authorized → show Login Widget ────
  if (!isTelegram && !token) {
    return (
      <>
        <Background />
        <TelegramLoginButton onAuth={loginWithWidget} />
      </>
    )
  }

  // ─── Main App ─────────────────────────────────────────────────
  return (
    <>
      <Background />
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
              onChatTap={(model, chatId) => openChat(model, chatId)}
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
            if (category === 'image' || category === 'video' || category === 'audio') {
              openGeneration(category)
            } else {
              openChat(modelName)
            }
          }}
        />
      )}

      {page === 'chat' && (
        <ChatPage key={chatId || chatModel} initialModel={chatModel} chatId={chatId} onBack={goBack} />
      )}

      {page === 'image-generation' && <ImageGenerationPage onBack={goBack} />}
      {page === 'video-generation' && <VideoGenerationPage onBack={goBack} />}
      {page === 'audio-generation' && <AudioGenerationPage onBack={goBack} />}
      {page === 'chats-history' && <ChatsHistoryPage onChatTap={(model, id) => openChat(model, id)} />}
      {page === 'profile' && <ProfilePage onNavigate={handleProfileNavigate} />}
      {page === 'topup' && <TopUpPage onBack={goBack} />}
      {page === 'transactions' && <TransactionsPage onBack={goBack} />}
      {page === 'subscription' && <SubscriptionPage onBack={goBack} />}
      {page === 'referral' && <ReferralPage onBack={goBack} />}
      {page === 'favorites' && (
        <FavoritesPage
          onBack={goBack}
          onOpenChat={(modelSlug, chatId) => openChat(modelSlug, chatId)}
          onOpenGeneration={(type) => openGeneration(type as 'image' | 'video' | 'audio')}
        />
      )}
      {/* {page === 'support' && <SupportPage onBack={goBack} />} */}

      <BottomNav active={activeNav} onChange={handleNavChange} />
    </>
  )
}