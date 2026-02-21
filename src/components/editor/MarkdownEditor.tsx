'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Bold, Code2, Heading1, ImageIcon, Italic, Link as LinkIcon, List, ListOrdered, MoreVertical, Quote, Table2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadImage } from '@/lib/editor/upload'
import { buildImageShortcode, buildVideoShortcode } from '@/lib/markdown/shortcodes'

type MarkdownEditorProps = {
  initialContent?: string
  onChange?: (content: string) => void
}

type ToolbarButtonProps = {
  label: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  buttonRef?: RefObject<HTMLButtonElement | null>
}

type SlashMatch = {
  query: string
  start: number
  end: number
}

type SlashCommand = {
  id: string
  label: string
  description: string
  keywords: string[]
  icon: ReactNode
  run: () => void
}

type ImageAlign = 'left' | 'center' | 'right'

type ImageDraft = {
  url: string
  alt: string
  caption: string
  width: string
  align: ImageAlign
}

const IMAGE_SIZE_PRESETS = [
  { id: 's', label: 'S', width: '40%' },
  { id: 'm', label: 'M', width: '70%' },
  { id: 'l', label: 'L', width: '100%' },
] as const

function isSupportedImagePreviewUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/')) return true
  return /^https?:\/\/.+/i.test(trimmed)
}

function ToolbarButton({ label, onClick, children, disabled, buttonRef }: ToolbarButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function insertAtSelection(
  value: string,
  start: number,
  end: number,
  prefix: string,
  suffix: string,
  placeholder: string,
) {
  const selected = value.slice(start, end)
  const core = selected || placeholder
  const next = `${value.slice(0, start)}${prefix}${core}${suffix}${value.slice(end)}`
  const cursorStart = start + prefix.length
  const cursorEnd = cursorStart + core.length
  return { next, cursorStart, cursorEnd }
}

function detectSlashContext(value: string, start: number, end: number): SlashMatch | null {
  if (start !== end) return null
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const linePrefix = value.slice(lineStart, start)
  const match = linePrefix.match(/(?:^|\s)\/([a-zA-Z]*)$/)
  if (!match) return null

  const slashOffset = linePrefix.lastIndexOf('/')
  if (slashOffset < 0) return null

  return {
    query: (match[1] ?? '').toLowerCase(),
    start: lineStart + slashOffset,
    end: start,
  }
}

export default function MarkdownEditor({ initialContent = '', onChange }: MarkdownEditorProps) {
  const [value, setValue] = useState(initialContent)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isImageToolboxOpen, setIsImageToolboxOpen] = useState(false)
  const [imageNotice, setImageNotice] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null)
  const [imageDraft, setImageDraft] = useState<ImageDraft>({
    url: '',
    alt: '',
    caption: '',
    width: '100%',
    align: 'center',
  })
  const [slashMatch, setSlashMatch] = useState<SlashMatch | null>(null)
  const [activeSlashIndex, setActiveSlashIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageToolbarButtonRef = useRef<HTMLButtonElement | null>(null)
  const imageUrlInputRef = useRef<HTMLInputElement | null>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const imagePreviewUrl = isSupportedImagePreviewUrl(imageDraft.url) ? imageDraft.url.trim() : null
  const onChangeRef = useRef(onChange)
  const valueRef = useRef(value)
  const prevInitialContentRef = useRef(initialContent)
  const isComposingRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (initialContent === prevInitialContentRef.current) return
    prevInitialContentRef.current = initialContent
    if (initialContent === valueRef.current) return
    if (typeof document !== 'undefined' && document.activeElement === textareaRef.current) return

    valueRef.current = initialContent
    setValue(initialContent)
    setSlashMatch(null)
  }, [initialContent])

  const commitValue = (nextValue: string, options?: { notify?: boolean }) => {
    const notify = options?.notify ?? true
    valueRef.current = nextValue
    setValue(nextValue)
    if (notify && !isComposingRef.current) {
      onChangeRef.current?.(nextValue)
    }
  }

  const selection = useMemo(() => {
    const textarea = textareaRef.current
    if (!textarea) return { start: value.length, end: value.length }
    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    }
  }, [value])

  const updateWithSelection = (updater: (start: number, end: number) => { next: string; cursorStart: number; cursorEnd: number }) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? selection.start
    const end = textarea?.selectionEnd ?? selection.end
    const result = updater(start, end)

    commitValue(result.next)

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(result.cursorStart, result.cursorEnd)
    })
  }

  const wrap = (prefix: string, suffix: string, placeholder: string) => {
    updateWithSelection((start, end) => insertAtSelection(value, start, end, prefix, suffix, placeholder))
  }

  const prefixLine = (prefix: string) => {
    updateWithSelection((start, end) => {
      const blockStart = value.lastIndexOf('\n', start - 1) + 1
      const blockEndIndex = value.indexOf('\n', end)
      const blockEnd = blockEndIndex === -1 ? value.length : blockEndIndex
      const block = value.slice(blockStart, blockEnd)
      const nextBlock = block
        .split('\n')
        .map((line) => `${prefix}${line}`)
        .join('\n')

      const next = `${value.slice(0, blockStart)}${nextBlock}${value.slice(blockEnd)}`
      const cursorStart = start + prefix.length
      const linesCount = block.split('\n').length
      const cursorEnd = end + (prefix.length * linesCount)

      return { next, cursorStart, cursorEnd }
    })
  }

  const insertBlock = (block: string) => {
    updateWithSelection((start, end) => {
      const before = value.slice(0, start)
      const after = value.slice(end)
      const needsLeadingBreak = before.length > 0 && !before.endsWith('\n')
      const needsTrailingBreak = after.length > 0 && !after.startsWith('\n')
      const insert = `${needsLeadingBreak ? '\n\n' : ''}${block}${needsTrailingBreak ? '\n\n' : ''}`
      const next = `${before}${insert}${after}`
      const cursor = before.length + insert.length
      return { next, cursorStart: cursor, cursorEnd: cursor }
    })
  }

  const insertTable = () => {
    insertBlock('| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |')
  }

  const insertMermaid = () => {
    insertBlock('```mermaid\nflowchart TD\n  A[Start] --> B[Done]\n```')
  }

  const setLink = () => {
    updateWithSelection((start, end) => {
      const selected = value.slice(start, end) || 'link text'
      const url = window.prompt('URL 입력', 'https://')
      if (!url) {
        return { next: value, cursorStart: start, cursorEnd: end }
      }
      return insertAtSelection(value, start, end, `[${selected}](`, ')', url)
    })
  }

  const setVideo = () => {
    const url = window.prompt('비디오 URL 입력 (YouTube/Vimeo)', 'https://')
    if (!url) return

    const shortcode = buildVideoShortcode(url)
    if (!shortcode) return
    insertBlock(shortcode)
  }

  const handleOpenFile = () => fileInputRef.current?.click()

  const openImageToolbox = (notice?: { type: 'info' | 'success' | 'error'; message: string }) => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement | null
    if (notice) setImageNotice(notice)
    setIsImageToolboxOpen(true)
  }

  const closeImageToolbox = () => {
    setIsImageToolboxOpen(false)
    setImageNotice(null)
    requestAnimationFrame(() => {
      imageToolbarButtonRef.current?.focus()
      if (lastFocusedElementRef.current && lastFocusedElementRef.current !== imageToolbarButtonRef.current) {
        lastFocusedElementRef.current.focus()
      }
    })
  }

  const resetImageDraft = () => {
    setImageDraft({
      url: '',
      alt: '',
      caption: '',
      width: '100%',
      align: 'center',
    })
  }

  const insertImageFromDraft = () => {
    const shortcode = buildImageShortcode(imageDraft.url, {
      alt: imageDraft.alt || undefined,
      caption: imageDraft.caption || undefined,
      width: imageDraft.width || undefined,
      align: imageDraft.align,
    })

    if (!shortcode) return
    insertBlock(shortcode)
    setImageNotice({ type: 'success', message: '이미지 shortcode가 삽입되었습니다.' })
    resetImageDraft()
    closeImageToolbox()
  }

  const closeSlashMenu = () => {
    setSlashMatch(null)
    setActiveSlashIndex(0)
  }

  const applySlashReplacement = (replacement: string, cursorOffset = replacement.length) => {
    if (!slashMatch) return
    const next = `${value.slice(0, slashMatch.start)}${replacement}${value.slice(slashMatch.end)}`
    const cursor = slashMatch.start + cursorOffset
    commitValue(next)
    closeSlashMenu()

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(cursor, cursor)
    })
  }

  const applySlashBlock = (block: string) => {
    if (!slashMatch) return
    const before = value.slice(0, slashMatch.start)
    const after = value.slice(slashMatch.end)
    const needsLeadingBreak = before.length > 0 && !before.endsWith('\n')
    const needsTrailingBreak = after.length > 0 && !after.startsWith('\n')
    const replacement = `${needsLeadingBreak ? '\n\n' : ''}${block}${needsTrailingBreak ? '\n\n' : ''}`
    const cursor = slashMatch.start + replacement.length

    commitValue(`${before}${replacement}${after}`)
    closeSlashMenu()

    requestAnimationFrame(() => {
      if (!textareaRef.current) return
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(cursor, cursor)
    })
  }

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsUploadingImage(true)
    try {
      const url = await uploadImage(file)
      setImageDraft((current) => ({
        ...current,
        url,
        alt: current.alt || file.name,
      }))
      openImageToolbox({ type: 'success', message: '이미지가 업로드되었습니다. 미리보기 후 삽입하세요.' })
    } catch {
      openImageToolbox({ type: 'error', message: '이미지 업로드에 실패했습니다. 다시 시도해 주세요.' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const uploadClipboardImage = async (file: File) => {
    setIsUploadingImage(true)
    try {
      const url = await uploadImage(file)
      const altFallback = file.name && file.name !== 'image.png' ? file.name : 'Clipboard image'

      setImageDraft((current) => ({
        ...current,
        url,
        alt: current.alt || altFallback,
      }))
      openImageToolbox({ type: 'success', message: '클립보드 이미지를 가져왔습니다. 옵션 확인 후 삽입하세요.' })
    } catch {
      openImageToolbox({ type: 'error', message: '클립보드 이미지 업로드에 실패했습니다.' })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const slashCommands: SlashCommand[] = [
    {
      id: 'code',
      label: 'Code Block',
      description: 'Capture a code snippet',
      keywords: ['code', 'snippet', 'block'],
      icon: <Code2 className="h-4 w-4" />,
      run: () => applySlashBlock('```ts\n// code\n```'),
    },
    {
      id: 'mermaid',
      label: 'Mermaid Diagram',
      description: 'Insert a mermaid diagram block',
      keywords: ['mermaid', 'diagram', 'flowchart', 'graph'],
      icon: <Code2 className="h-4 w-4" />,
      run: () => applySlashBlock('```mermaid\nflowchart TD\n  A[Start] --> B[Done]\n```'),
    },
    {
      id: 'table',
      label: 'Table',
      description: 'Insert a markdown table',
      keywords: ['table', 'grid', 'markdown'],
      icon: <Table2 className="h-4 w-4" />,
      run: () => applySlashBlock('| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |'),
    },
    {
      id: 'image',
      label: 'Image',
      description: 'Upload or embed an image',
      keywords: ['image', 'photo', 'media'],
      icon: <ImageIcon className="h-4 w-4" />,
      run: () => {
        if (!slashMatch) return
        applySlashReplacement('')
        requestAnimationFrame(() => openImageToolbox({ type: 'info', message: '이미지 URL을 붙여넣거나 Upload를 사용하세요.' }))
      },
    },
    {
      id: 'bullet',
      label: 'Bulleted List',
      description: 'Create a simple bulleted list',
      keywords: ['bullet', 'list'],
      icon: <List className="h-4 w-4" />,
      run: () => applySlashReplacement('- '),
    },
    {
      id: 'ordered',
      label: 'Ordered List',
      description: 'Create a numbered list',
      keywords: ['ordered', 'number', 'list'],
      icon: <ListOrdered className="h-4 w-4" />,
      run: () => applySlashReplacement('1. '),
    },
    {
      id: 'quote',
      label: 'Quote',
      description: 'Insert a quote block',
      keywords: ['quote', 'blockquote'],
      icon: <Quote className="h-4 w-4" />,
      run: () => applySlashReplacement('> '),
    },
    {
      id: 'heading',
      label: 'Heading',
      description: 'Insert a level-1 heading',
      keywords: ['heading', 'title'],
      icon: <Heading1 className="h-4 w-4" />,
      run: () => applySlashReplacement('# '),
    },
    {
      id: 'link',
      label: 'Link',
      description: 'Insert markdown link syntax',
      keywords: ['link', 'url'],
      icon: <LinkIcon className="h-4 w-4" />,
      run: () => applySlashReplacement('[link text](https://)', '[link text]('.length),
    },
    {
      id: 'video',
      label: 'Video',
      description: 'Insert video shortcode',
      keywords: ['video', 'youtube', 'vimeo'],
      icon: <Video className="h-4 w-4" />,
      run: () => applySlashBlock('@[video](https://){provider="youtube",title="Video"}'),
    },
  ]

  const filteredSlashCommands = !slashMatch
    ? []
    : (() => {
      const query = slashMatch.query.trim()
      if (!query) return slashCommands
      return slashCommands.filter((command) => {
        const haystack = `${command.label} ${command.description} ${command.keywords.join(' ')}`.toLowerCase()
        return haystack.includes(query)
      })
    })()

  useEffect(() => {
    setActiveSlashIndex(0)
  }, [slashMatch?.query])

  const updateSlashBySelection = (nextValue: string, start: number, end: number) => {
    const nextMatch = detectSlashContext(nextValue, start, end)
    if (!nextMatch) {
      if (slashMatch) {
        closeSlashMenu()
      }
      return
    }
    setSlashMatch(nextMatch)
  }

  const handleTextareaChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value
    commitValue(nextValue)
    updateSlashBySelection(nextValue, event.target.selectionStart, event.target.selectionEnd)
  }

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashMatch || filteredSlashCommands.length === 0) {
      if (event.key === 'Escape' && slashMatch) {
        closeSlashMenu()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSlashIndex((current) => (current + 1) % filteredSlashCommands.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSlashIndex((current) => (current - 1 + filteredSlashCommands.length) % filteredSlashCommands.length)
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      filteredSlashCommands[activeSlashIndex]?.run()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeSlashMenu()
    }
  }

  const handleTextareaPaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items
    if (!items || items.length === 0) return

    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'))
    if (!imageItem) return

    const file = imageItem.getAsFile()
    if (!file) return

    event.preventDefault()
    setImageNotice({ type: 'info', message: '클립보드 이미지를 업로드 중입니다...' })
    await uploadClipboardImage(file)
  }

  useEffect(() => {
    if (!isImageToolboxOpen) return

    const timer = window.setTimeout(() => {
      imageUrlInputRef.current?.focus()
    }, 30)

    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeImageToolbox()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isImageToolboxOpen])

  return (
    <section className="space-y-3">
      <div className="sticky top-4 z-20 flex justify-center">
        <div className="inline-flex max-w-full items-center gap-1 rounded-2xl border border-border/80 bg-card/95 px-2 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <ToolbarButton label="Bold" onClick={() => wrap('**', '**', 'bold text')}>
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => wrap('*', '*', 'italic text')}>
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <ToolbarButton label="Heading" onClick={() => prefixLine('# ')}>
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Bullet List" onClick={() => prefixLine('- ')}>
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Ordered List" onClick={() => prefixLine('1. ')}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Quote" onClick={() => prefixLine('> ')}>
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <ToolbarButton label="Code Block" onClick={() => insertBlock('```ts\n// code\n```')}>
            <span className="font-mono text-xs">&lt;/&gt;</span>
          </ToolbarButton>
          <ToolbarButton label="Mermaid Diagram" onClick={insertMermaid}>
            <span className="font-mono text-[10px] font-semibold">MMD</span>
          </ToolbarButton>
          <ToolbarButton label="Table" onClick={insertTable}>
            <Table2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Link" onClick={setLink}>
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Image"
            onClick={() => openImageToolbox({ type: 'info', message: '이미지 URL 또는 업로드로 추가할 수 있습니다.' })}
            disabled={isUploadingImage}
            buttonRef={imageToolbarButtonRef}
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Video" onClick={setVideo}>
            <Video className="h-4 w-4" />
          </ToolbarButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <button
            type="button"
            aria-label="Editor status"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground"
          >
            <MoreVertical className="h-4 w-4" />
            {isUploadingImage ? '업로드 중' : 'MD'}
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onCompositionStart={() => {
            isComposingRef.current = true
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false
            const nextValue = event.currentTarget.value
            valueRef.current = nextValue
            onChangeRef.current?.(nextValue)
          }}
          onKeyDown={handleTextareaKeyDown}
          onPaste={handleTextareaPaste}
          onClick={(event) => updateSlashBySelection(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd)}
          onKeyUp={(event) => updateSlashBySelection(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd)}
          onBlur={() => {
            window.setTimeout(() => closeSlashMenu(), 100)
          }}
          placeholder="마크다운으로 포스트를 작성하세요..."
          className="min-h-[520px] w-full rounded-lg border border-border bg-card p-4 font-mono text-sm leading-7 outline-none ring-primary transition focus:ring-2"
        />

        {slashMatch ? (
          <div className="absolute left-4 top-14 z-30 w-[min(560px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">BASIC BLOCKS</p>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filteredSlashCommands.length > 0 ? (
                filteredSlashCommands.map((command, index) => {
                  const isActive = index === activeSlashIndex
                  return (
                    <button
                      key={command.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        command.run()
                      }}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                        isActive
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-transparent hover:border-border hover:bg-muted/60'
                      }`}
                    >
                      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {command.icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-foreground">{command.label}</span>
                        <span className="block text-sm text-muted-foreground">{command.description}</span>
                      </span>
                    </button>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">NAVIGATE WITH ARROWS</p>
              <p className="text-xs text-muted-foreground">↑ ↓ Enter Esc</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        <p>
          Image shortcode:{' '}
          <code>@[image](https://...)&#123;alt=&quot;...&quot;,width=&quot;100%&quot;,align=&quot;center&quot;,caption=&quot;...&quot;&#125;</code>
        </p>
        <p>
          Video shortcode:{' '}
          <code>@[video](https://...)&#123;provider=&quot;youtube&quot;,title=&quot;...&quot;&#125;</code>
        </p>
        <p>
          Mermaid block: <code>{'```mermaid ... ```'}</code>
        </p>
        <p>
          Slash commands: <code>/code /mermaid /table /image /bullet /ordered /quote /heading /link /video</code>
        </p>
        <p>
          Paste image: <code>Ctrl/Cmd + V</code> (클립보드 이미지를 자동 업로드 후 Image toolbox에 채웁니다)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      {isImageToolboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Image toolbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeImageToolbox()
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">IMAGE TOOLBOX</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleOpenFile} disabled={isUploadingImage}>
                  {isUploadingImage ? '업로드 중...' : 'Upload'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={closeImageToolbox}>
                  Close
                </Button>
              </div>
            </div>

            {imageNotice ? (
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
                  imageNotice.type === 'error'
                    ? 'border-red-500/40 bg-red-500/10 text-red-300'
                    : imageNotice.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-primary/40 bg-primary/10 text-primary'
                }`}
              >
                {imageNotice.message}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>Image URL</span>
                  <input
                    ref={imageUrlInputRef}
                    value={imageDraft.url}
                    onChange={(event) => setImageDraft((current) => ({ ...current, url: event.target.value }))}
                    placeholder="https://..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>Alt Text</span>
                  <input
                    value={imageDraft.alt}
                    onChange={(event) => setImageDraft((current) => ({ ...current, alt: event.target.value }))}
                    placeholder="Describe image for accessibility"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>Caption</span>
                  <input
                    value={imageDraft.caption}
                    onChange={(event) => setImageDraft((current) => ({ ...current, caption: event.target.value }))}
                    placeholder="Optional caption"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>Width</span>
                  <input
                    value={imageDraft.width}
                    onChange={(event) => setImageDraft((current) => ({ ...current, width: event.target.value }))}
                    placeholder="100% or 720px"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>

                <div className="md:col-span-2">
                  <p className="mb-1 text-xs text-muted-foreground">Size & Alignment</p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {IMAGE_SIZE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setImageDraft((current) => ({ ...current, width: preset.width }))}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                          imageDraft.width.trim() === preset.width
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <div className="h-5 w-px bg-border" />
                  {(['left', 'center', 'right'] as ImageAlign[]).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => setImageDraft((current) => ({ ...current, align }))}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        imageDraft.align === align
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/70 p-3">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">PREVIEW</p>
                {imagePreviewUrl ? (
                  <figure className={`flex flex-col gap-2 ${imageDraft.align === 'left' ? 'items-start' : imageDraft.align === 'right' ? 'items-end' : 'items-center'}`}>
                    <Image
                      src={imagePreviewUrl}
                      alt={imageDraft.alt || 'Preview image'}
                      width={1200}
                      height={800}
                      style={{ width: imageDraft.width || '100%', maxWidth: '100%' }}
                      className="max-h-[220px] rounded-lg border border-border object-contain"
                      unoptimized
                    />
                    {imageDraft.caption ? <figcaption className="text-xs text-muted-foreground">{imageDraft.caption}</figcaption> : null}
                  </figure>
                ) : (
                  <div className="flex h-[170px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                    Image URL 또는 Upload로 미리보기를 준비하세요.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={resetImageDraft}>
                Reset
              </Button>
              <Button type="button" size="sm" onClick={insertImageFromDraft} disabled={!imageDraft.url.trim()}>
                Insert Image
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
