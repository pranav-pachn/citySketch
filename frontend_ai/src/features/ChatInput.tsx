import { useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/entities/store/useStore'
import { ArrowUp, Save } from 'lucide-react'

export function ChatInput() {
  const prompt = useStore((s) => s.prompt)
  const setPrompt = useStore((s) => s.setPrompt)
  const submitPrompt = useStore((s) => s.submitPrompt)
  const isLoading = useStore((s) => s.isLoading)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [])

  useEffect(() => {
    resize()
  }, [prompt, resize])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && prompt.trim()) {
        submitPrompt(false)
      }
    }
  }

  const SUGGESTIONS = [
    'eco-friendly city with low traffic',
    'high-density downtown with public transit',
    'coastal town with a large central park',
  ]

  return (
    <div className="chat-input-wrapper">
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a city layout…"
          className="chat-textarea"
          rows={1}
          disabled={isLoading}
          spellCheck={false}
        />
        <button
          onClick={() => submitPrompt(true)}
          disabled={isLoading || !prompt.trim()}
          className="chat-save"
          title="Generate and save"
        >
          <Save size={16} strokeWidth={1.8} />
        </button>
        <button
          onClick={() => submitPrompt(false)}
          disabled={isLoading || !prompt.trim()}
          className="chat-submit"
          title="Generate without saving"
        >
          <ArrowUp size={18} strokeWidth={2} />
        </button>
      </div>
      <div className="chat-suggestions">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion-chip"
            onClick={() => setPrompt(s)}
            disabled={isLoading}
            title={`Use suggestion: ${s}`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="chat-hint">
        Press Enter to generate only · Use Save button to generate and save
      </p>
    </div>
  )
}
