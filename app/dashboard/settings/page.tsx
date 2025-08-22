'use client'

import React, { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'

interface UserSettings {
  username: string
  email: string
  profileInitial?: string
  emailNotifications: boolean
  pushNotifications: boolean
  recommendedVideos: boolean
  playbackQuality: string
  keepSubscriptionsPrivate: boolean
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
        checked ? 'bg-purple-600' : 'bg-gray-600'
      }`}
      type="button"
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    username: '',
    email: '',
    profileInitial: 'S',
    emailNotifications: true,
    pushNotifications: false,
    recommendedVideos: true,
    playbackQuality: '720p',
    keepSubscriptionsPrivate: true,
  })

  useEffect(() => {
    let mounted = true
    // Fetch real settings from server
    ;(async () => {
      try {
        const res = await fetch('/api/user/settings')
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        if (!mounted) return
        setSettings((s) => ({ ...s, ...json }))
      } catch (err: any) {
        // If the API route isn't implemented yet, keep defaults.
        console.warn('user settings fetch failed:', err?.message ?? err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const handleChange = (patch: Partial<UserSettings>) => setSettings((s) => ({ ...s, ...patch }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error(await res.text())
      // Optionally show toast
    } catch (err: any) {
      setError(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // reload from server or reset to previous state
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch('/api/user/settings')
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setSettings((s) => ({ ...s, ...json }))
      } catch (err) {
        // noop
      } finally {
        setLoading(false)
      }
    })()
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 main-content ml-60" aria-live="polite">
        <header className="flex justify-between items-center mb-8">
          <div className="w-1/2">
            <div className="relative">
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Search for educational videos..."
                type="text"
              />
              <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <span className="material-icons text-gray-300 hover:text-white cursor-pointer">videocam</span>
            <span className="material-icons text-gray-300 hover:text-white cursor-pointer">notifications</span>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white">S</div>
          </div>
        </header>

        <h2 className="text-3xl font-bold mb-8">Settings</h2>

        <div className="bg-gray-800 p-8 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <h3 className="text-xl font-semibold mb-2">Account</h3>
              <p className="text-gray-400">Manage your account details and preferences.</p>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="username">Username</label>
                <input
                  id="username"
                  value={settings.username}
                  onChange={(e) => handleChange({ username: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange({ email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-2xl">{settings.profileInitial}</div>
                  <div className="flex items-center space-x-2">
                    <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md">Change</button>
                    <button className="text-gray-400 hover:text-white">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-700 my-10" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <h3 className="text-xl font-semibold mb-2">Notifications</h3>
              <p className="text-gray-400">Control how you receive notifications.</p>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Email Notifications</h4>
                  <p className="text-sm text-gray-400">Receive notifications via email for new uploads and comments.</p>
                </div>
                <Toggle checked={settings.emailNotifications} onChange={(v) => handleChange({ emailNotifications: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Push Notifications</h4>
                  <p className="text-sm text-gray-400">Get push notifications on your devices.</p>
                </div>
                <Toggle checked={settings.pushNotifications} onChange={(v) => handleChange({ pushNotifications: v })} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Recommended Videos</h4>
                  <p className="text-sm text-gray-400">Notify me about recommended videos.</p>
                </div>
                <Toggle checked={settings.recommendedVideos} onChange={(v) => handleChange({ recommendedVideos: v })} />
              </div>
            </div>
          </div>

          <hr className="border-gray-700 my-10" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="md:col-span-1">
              <h3 className="text-xl font-semibold mb-2">Privacy</h3>
              <p className="text-gray-400">Manage your privacy settings.</p>
            </div>

            <div className="md:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="playback-quality">Default Video Quality</label>
                <select
                  id="playback-quality"
                  value={settings.playbackQuality}
                  onChange={(e) => handleChange({ playbackQuality: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option>Auto (recommended)</option>
                  <option>1080p</option>
                  <option>720p</option>
                  <option>480p</option>
                  <option>360p</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Keep my subscriptions private</h4>
                  <p className="text-sm text-gray-400">Your subscriptions will not be visible to others.</p>
                </div>
                <Toggle checked={settings.keepSubscriptionsPrivate} onChange={(v) => handleChange({ keepSubscriptionsPrivate: v })} />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-12">
            <button onClick={handleCancel} disabled={saving} className="text-gray-300 hover:text-white font-semibold py-2 px-5 rounded-full mr-4">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-5 rounded-full">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>

          {error && <div className="text-sm text-red-400 mt-4">{error}</div>}
        </div>
      </main>
    </div>
  )
}
