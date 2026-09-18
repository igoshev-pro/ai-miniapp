// src/lib/keyboard.ts

import type { KeyboardEvent } from 'react'

/**
 * Enter в поле промта — отправка, Shift+Enter — перенос строки.
 *
 * На тач-устройствах Shift на экранной клавиатуре неудобен, а промты
 * многострочные — там Enter остаётся переносом, отправка только кнопкой.
 * Возвращает true, если событие — это «отправить» (и уже preventDefault).
 */
export function isSubmitEnter(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' || e.shiftKey) return false
  // IME (китайский/японский и т.п.): Enter подтверждает ввод, а не отправляет
  if (e.nativeEvent.isComposing || e.keyCode === 229) return false
  if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
    return false
  }
  e.preventDefault()
  return true
}
