// src/components/ui/MessageContent.tsx

'use client'

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'

interface Props {
  content: string
}

export const MessageContent = memo(function MessageContent({ content }: Props) {
  return (
    <div className="msg-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Код-блоки с кнопкой копирования
          pre: ({ children }) => <CodeBlockWrapper>{children}</CodeBlockWrapper>,

          // Inline-код
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return <code className="msg-markdown__inline-code" {...props}>{children}</code>
            }
            return <code className={className} {...props}>{children}</code>
          },

          // Ссылки — открываются в новом окне
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="msg-markdown__link">
              {children}
            </a>
          ),

          // Таблицы
          table: ({ children }) => (
            <div className="msg-markdown__table-wrap">
              <table className="msg-markdown__table">{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})

function CodeBlockWrapper({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    // Достаём текст из <pre><code>...</code></pre>
    const el = document.createElement('div')
    // Рендерим children как строку
    const codeText = extractText(children)
    navigator.clipboard.writeText(codeText).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="msg-code-block">
      <button className="msg-code-block__copy" onClick={handleCopy}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Скопировано' : 'Копировать'}
      </button>
      <pre className="msg-code-block__pre">{children}</pre>
    </div>
  )
}

// Извлечение текста из React children рекурсивно
function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (!node) return ''
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    const el = node as { props: Record<string, unknown> }
    return extractText(el.props.children as React.ReactNode)
  }
  return ''
}