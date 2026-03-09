// src/lib/ws/index.ts

export {
  getSocket,
  connectSocket,
  disconnectSocket,
  subscribeToGeneration,
  unsubscribeFromGeneration,
  WS_EVENTS,
  type GenerationStatusEvent,
  type GenerationProgressEvent,
  type GenerationCompletedEvent,
  type GenerationFailedEvent,
} from './socket'