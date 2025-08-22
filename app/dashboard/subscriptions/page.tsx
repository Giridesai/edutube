'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { useRouter } from 'next/navigation'

interface ChannelItem {
  id: string
  name: string
  handle?: string
  avatarUrl?: string
  channelId?: string
  description?: string
  subscribedAt?: string
}

// Helper to ensure we never render the placeholder 'Channel'
function displayName(c: ChannelItem): string {
  const nm = (c.name || '').trim()
  if (nm && nm.toLowerCase() !== 'channel') return nm
  if (c.handle) return c.handle
  if (c.channelId) return `Channel ${c.channelId.slice(0, 6)}…`
  return 'Channel'
}

type SortKey = 'recent' | 'az' | 'za'

function timeAgo(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  const y = Math.floor(mo / 12)
  return `${y}y ago`
}

export default function SubscriptionsPage() {
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null)
  const router = useRouter()

  const load = async (reset = false) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/user/subscriptions?limit=24&offset=${reset ? 0 : offset}`)
      if (res.status === 401) {
        router.push('/auth/signin')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      const json = await res.json()
      const newChannels = (json.channels || []) as ChannelItem[]
      setChannels(reset ? newChannels : [...channels, ...newChannels])
      setHasMore(!!json.hasMore)
      setTotal(typeof json.total === 'number' ? json.total : null)
      setOffset(reset ? newChannels.length : offset + newChannels.length)
    } catch (e: any) {
      setError(e?.message || 'Failed to load subscriptions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(true) }, [])

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase()
    let arr = channels
    if (q) {
      arr = arr.filter(c => c.name?.toLowerCase().includes(q) || c.handle?.toLowerCase().includes(q))
    }
    const sorted = [...arr]
    if (sort === 'recent') {
      sorted.sort((a, b) => new Date(b.subscribedAt || 0).getTime() - new Date(a.subscribedAt || 0).getTime())
    } else if (sort === 'az') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sort === 'za') {
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''))
    }
    return sorted
  }, [channels, query, sort])

  const unsubscribe = async (c: ChannelItem) => {
    if (!c.channelId || unsubscribingId) return
    setUnsubscribingId(c.id)
    try {
      const res = await fetch(`/api/channel/${encodeURIComponent(c.channelId)}/subscribe`, { method: 'DELETE' })
      if (res.status === 401) {
        router.push('/auth/signin')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      setChannels(prev => prev.filter(x => x.id !== c.id))
      setTotal(t => (typeof t === 'number' ? Math.max(0, t - 1) : t))
    } catch (e) {
      // no-op
    } finally {
      setUnsubscribingId(null)
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 main-content ml-60">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
            <span className="material-icons text-purple-400">subscriptions</span>
            <span>Subscriptions</span>
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-icons text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 text-sm">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search channels"
                className="pl-10 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="recent">Recently subscribed</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setView('grid')}
                className={`px-3 py-2 ${view === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                title="Grid view"
              >
                <span className="material-icons text-sm">view_module</span>
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 ${view === 'list' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white'}`}
                title="List view"
              >
                <span className="material-icons text-sm">view_list</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-400 mb-4">
          {typeof total === 'number' ? `${total} channels` : `${channels.length} channels loaded`}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded mb-6">{error}</div>
        )}

        {loading && channels.length === 0 ? (
          <div className={`${view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-3'} animate-pulse`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={view === 'grid' ? 'bg-gray-800/50 border border-gray-800 rounded-2xl h-32' : 'bg-gray-800/50 border border-gray-800 rounded-xl h-20'} />
            ))}
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="material-icons text-gray-500 text-2xl">subscriptions</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No subscriptions found</h3>
            <p className="text-gray-500 text-sm mb-6">{query ? 'Try a different search.' : 'Subscribe to your favorite channels to see them here.'}</p>
            <Link href="/dashboard" className="inline-flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
              <span className="material-icons">explore</span>
              <span>Explore videos</span>
            </Link>
          </div>
        ) : (
          <>
            {view === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredSorted.map((c) => (
                  <article
                    key={c.id}
                    className="group relative rounded-2xl bg-gray-900/60 border border-gray-800 hover:border-gray-700 hover:bg-gray-900 transition-all shadow-sm hover:shadow-lg"
                  >
                    {/* Decorative header */}
                    <div className="h-16 bg-gradient-to-r from-purple-600/20 via-transparent to-blue-600/20" />

                    <div className="px-5 pb-4 -mt-8">
                      <div className="flex items-center gap-3">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={displayName(c)}
                            className="w-14 h-14 rounded-full ring-4 ring-gray-900/70 border border-gray-700 object-cover"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg ring-4 ring-gray-900/70 border border-gray-700">
                            {displayName(c)[0]?.toUpperCase() || 'C'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold text-gray-100 truncate">
                              {c.channelId ? (
                                <Link href={`/dashboard/channel/${encodeURIComponent(c.channelId)}`} className="hover:text-purple-400">
                                  {displayName(c)}
                                </Link>
                              ) : (
                                displayName(c)
                              )}
                            </div>
                            {c.handle && <div className="text-xs text-gray-500 truncate">{c.handle}</div>}
                          </div>
                          <div className="mt-1">
                            <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                              <span className="material-icons mr-1 text-[12px]">schedule</span>
                              Subscribed {timeAgo(c.subscribedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {c.description && (
                        <p className="text-xs text-gray-400 mt-3 line-clamp-3">{c.description}</p>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <div />
                        <div className="flex items-center gap-2">
                          {c.channelId && (
                            <Link
                              href={`/dashboard/channel/${encodeURIComponent(c.channelId)}`}
                              className="text-xs bg-purple-600/90 hover:bg-purple-600 text-white border border-purple-700 rounded px-3 py-1"
                              title="View channel"
                            >
                              View
                            </Link>
                          )}
                          <button
                            onClick={() => unsubscribe(c)}
                            disabled={unsubscribingId === c.id}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded px-3 py-1 disabled:opacity-60"
                            title="Unsubscribe"
                          >
                            {unsubscribingId === c.id ? '...' : 'Unsubscribe'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-800 rounded-2xl border border-gray-800 bg-gray-900/50">
                {filteredSorted.map((c) => (
                  <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-gray-900/60 transition-colors">
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={displayName(c)}
                        className="w-12 h-12 rounded-full ring-2 ring-gray-900/70 border border-gray-700 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-900/70 border border-gray-700">
                        {displayName(c)[0]?.toUpperCase() || 'C'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-200 truncate">
                          {c.channelId ? (
                            <Link href={`/dashboard/channel/${encodeURIComponent(c.channelId)}`} className="hover:text-purple-400">
                              {displayName(c)}
                            </Link>
                          ) : (
                            displayName(c)
                          )}
                        </div>
                        {c.handle && <div className="text-xs text-gray-500 truncate">{c.handle}</div>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                          <span className="material-icons mr-1 text-[12px]">schedule</span>
                          Subscribed {timeAgo(c.subscribedAt)}
                        </span>
                      </div>
                      {c.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {c.channelId && (
                        <Link
                          href={`/dashboard/channel/${encodeURIComponent(c.channelId)}`}
                          className="text-xs bg-purple-600/90 hover:bg-purple-600 text-white border border-purple-700 rounded px-3 py-1"
                        >
                          View
                        </Link>
                      )}
                      <button
                        onClick={() => unsubscribe(c)}
                        disabled={unsubscribingId === c.id}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded px-3 py-1 disabled:opacity-60"
                      >
                        {unsubscribingId === c.id ? 'Unsubscribing...' : 'Unsubscribe'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="text-center mt-8">
                <button onClick={() => load(false)} disabled={loading} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg border border-gray-700 disabled:opacity-60">
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
