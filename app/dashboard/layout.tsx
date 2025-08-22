'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Pages that can be accessed without authentication (demo mode)
  const publicPages = ['/dashboard/subscriptions', '/dashboard']

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    // Only redirect to sign-in if not on a public page and no session
    if (!session && !publicPages.includes(pathname)) {
      router.push('/auth/signin')
    }
  }, [session, status, router, pathname])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out z-40`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      <div className="flex-1 lg:ml-60 min-h-screen">
        {/* Header with user info */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 sticky top-0 z-30">
          <div className="flex justify-between items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <span className="material-icons">menu</span>
            </button>
            
            <div className="flex items-center space-x-4 ml-auto">
              {session ? (
                <>
                  <span className="text-sm text-gray-300">
                    Welcome back, {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-yellow-300 bg-yellow-900/30 px-3 py-1 rounded">
                    Demo Mode
                  </span>
                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Main content area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
