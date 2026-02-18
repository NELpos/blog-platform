'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type GoogleIdConfiguration = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: 'signin' | 'signup' | 'use'
  itp_support?: boolean
  use_fedcm_for_prompt?: boolean
}

type GoogleCredentialResponse = {
  credential?: string
}

type GooglePromptMomentNotification = {
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
  isDismissedMoment?: () => boolean
}

type GoogleAccountsId = {
  initialize: (config: GoogleIdConfiguration) => void
  prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void
  cancel: () => void
}

type GoogleAccounts = {
  id: GoogleAccountsId
}

type GoogleNamespace = {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: GoogleNamespace
  }
}

const GSI_SCRIPT_ID = 'google-identity-services'
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const isDev = process.env.NODE_ENV !== 'production'
const FEDCM_ABORT_LOG_PATTERN = '[GSI_LOGGER]: FedCM get() rejects with AbortError'

let scriptLoadPromise: Promise<void> | null = null
let originalConsoleError: typeof console.error | null = null
let consoleFilterRefCount = 0

function installFedCmConsoleFilter() {
  if (!isDev) {
    return () => {}
  }

  if (!originalConsoleError) {
    originalConsoleError = console.error
  }

  if (consoleFilterRefCount === 0) {
    console.error = (...args: unknown[]) => {
      const firstArg = typeof args[0] === 'string' ? args[0] : ''
      if (firstArg.includes(FEDCM_ABORT_LOG_PATTERN)) {
        return
      }
      originalConsoleError?.(...args)
    }
  }

  consoleFilterRefCount += 1

  return () => {
    consoleFilterRefCount = Math.max(0, consoleFilterRefCount - 1)
    if (consoleFilterRefCount === 0 && originalConsoleError) {
      console.error = originalConsoleError
      originalConsoleError = null
    }
  }
}

function loadGoogleScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true' || window.google?.accounts?.id) {
        resolve()
        return
      }
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => {
        scriptLoadPromise = null
        reject(new Error('Failed to load Google script'))
      }, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GSI_SCRIPT_ID
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Failed to load Google script'))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export function GoogleOneTap() {
  const router = useRouter()
  const initializedRef = useRef(false)

  useEffect(() => {
    const removeConsoleFilter = installFedCmConsoleFilter()
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    if (!clientId || initializedRef.current) {
      removeConsoleFilter()
      return
    }

    let isMounted = true

    const initialize = async () => {
      try {
        await loadGoogleScript()

        if (!isMounted || !window.google?.accounts?.id) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            const idToken = response.credential

            if (!idToken) {
              return
            }

            const supabase = createClient()
            const { error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            })

            if (error) {
              toast.error(`원탭 로그인 실패: ${error.message}`)
              return
            }

            router.replace('/dashboard')
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: 'signin',
          itp_support: true,
          use_fedcm_for_prompt: true,
        })

        window.google.accounts.id.prompt((notification) => {
          if (!isDev) {
            return
          }

          const state = {
            notDisplayed: notification.isNotDisplayed?.() ?? false,
            skipped: notification.isSkippedMoment?.() ?? false,
            dismissed: notification.isDismissedMoment?.() ?? false,
          }

          if (state.notDisplayed || state.skipped || state.dismissed) {
            console.info('[GoogleOneTap] prompt state', state)
          }
        })

        initializedRef.current = true
      } catch (error) {
        if (isDev) {
          console.error('[GoogleOneTap] failed to initialize', {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }

    void initialize()

    return () => {
      isMounted = false
      if (!isDev && window.google?.accounts?.id) {
        window.google.accounts.id.cancel()
      }
      removeConsoleFilter()
    }
  }, [router])

  return null
}
