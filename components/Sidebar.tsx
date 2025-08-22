'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: 'home', label: 'Home' },
  { href: '/dashboard/subscriptions', icon: 'subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/library', icon: 'video_library', label: 'Library' },
  { href: '/dashboard/history', icon: 'history', label: 'History' },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  
  return (
    <aside className="fixed top-0 left-0 h-screen bg-black p-6 flex flex-col sidebar w-60 z-40" aria-label="Main navigation">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <span className="material-icons">close</span>
        </button>
      )}
      
      <div className="flex-1">
        <div className="flex items-center mb-10">
          <span className="material-icons text-purple-400 text-3xl mr-2" aria-hidden="true">
            school
          </span>
          <h1 className="text-2xl font-bold">EduTube</h1>
        </div>
        
        <nav className="flex flex-col space-y-2" role="navigation">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link 
                key={item.href}
                className={`flex items-center p-3 rounded-xl border transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 ${
                  isActive 
                    ? 'text-white bg-purple-600 border-purple-500' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 border-transparent hover:border-gray-600'
                }`}
                href={item.href}
                onClick={onClose} // Close sidebar on mobile when navigating
              >
                <span className="material-icons mr-4 text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
          
          <div className="border-t border-gray-700 my-4"></div>
          
          <Link 
            key="settings"
            className={`flex items-center p-3 rounded-xl border transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 ${
              pathname === '/dashboard/settings'
                ? 'text-white bg-purple-600 border-purple-500' 
                : 'text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700 border-transparent hover:border-gray-600'
            }`}
            href="/dashboard/settings"
            onClick={onClose} // Close sidebar on mobile when navigating
          >
            <span className="material-icons mr-4 text-xl">settings</span>
            <span className="font-medium">Settings</span>
          </Link>
        </nav>
      </div>
    </aside>
  )
}
