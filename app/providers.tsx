'use client'

import { SessionProvider } from 'next-auth/react'
import { useEffect } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Suppress NextAuth client fetch errors in console
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = args[0]
      if (
        typeof message === 'string' &&
        (message.includes('[next-auth][error][CLIENT_FETCH_ERROR]') ||
         message.includes('Load failed') ||
         message.includes('CLIENT_FETCH_ERROR'))
      ) {
        // Log the error once for debugging but don't spam console
        console.debug('NextAuth connection issue (retrying automatically):', message)
        return
      }
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchInterval={30}
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}
