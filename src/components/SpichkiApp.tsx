// src/components/SpichkiApp.tsx

'use client'

import { useState, useCallback } from 'react'
import { useTelegram } from '@/context/TelegramContext'
import { useAuth, useUser } from '@/hooks'
import { StickyHeader } from './StickyHeader'
import { Background } from './Background'
import { ActionCards } from './ActionCards'
import { Categories } from './Categories'
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
  const { isReady } = useTelegram()
  const { isReady: authReady } = useAuth()
  const { refetch: refetchUser } = useUser()

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
    (model?: string, existingChatId?: string) => {
      setChatModel(model || 'ChatGPT 4o')
      setChatId(existingChatId)
      navigateTo('chat')
      setActiveNav('create')
    },
    [navigateTo],
  )

  const openGeneration = useCallback(
    (type: 'image' | 'video' | 'audio') => {
      navigateTo(`${type}-generation` as Page)
      setActiveNav('create')
    },
    [navigateTo],
  )

  // Обработка навигации с ActionCards на главной
  const handleActionNavigate = useCallback(
    (target: string) => {
      if (target === 'topup') navigateTo('topup')
      else if (target === 'subscription') navigateTo('subscription')
      else if (target === 'referral') navigateTo('referral')
    },
    [navigateTo],
  )

  // Обработка навигации из ProfilePage
  const handleProfileNavigate = useCallback(
    (target: string) => {
      if (target === 'topup') navigateTo('topup')
      else if (target === 'transactions') navigateTo('transactions')
      else if (target === 'favorites') navigateTo('favorites')
      else if (target === 'support') navigateTo('support')
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
      } else if (id === 'chats') {
        setPage('chats-history')
        setActiveNav('chats')
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

  if (!isReady || !authReady) {
    return (
      <div className="app-loading">
        <div className="app-loading__logo">🔥</div>
        <div className="app-loading__text">Спички</div>
        <div className="app-loading__bar">
          <div className="app-loading__bar-fill" />
        </div>
      </div>
    )
  }

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
          onOpenChat={(id, model) => openChat(model, id)}
          onOpenGeneration={(type) => openGeneration(type as 'image' | 'video' | 'audio')}
        />
      )}
      {page === 'support' && <SupportPage />}

      <BottomNav active={activeNav} onChange={handleNavChange} />
    </>
  )
}