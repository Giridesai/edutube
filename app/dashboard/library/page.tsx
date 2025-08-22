'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export interface LibraryVideo {
  id: string
  title: string
  thumbnailUrl?: string
  duration?: string
  channel?: string
  views?: string
  published?: string
}

export interface PlaylistItem {
  id: string
  title: string
  coverUrl?: string
  count?: number
  owner?: string
}

function useLibrary() {
  const [history, setHistory] = useState<LibraryVideo[]>([])
  const [watchLater, setWatchLater] = useState<LibraryVideo[]>([])
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        // Implement server route: GET /api/user/library -> { history, watchLater, playlists }
        const res = await fetch('/api/user/library')
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        if (!mounted) return
        setHistory(json.history || [])
        setWatchLater(json.watchLater || [])
        setPlaylists(json.playlists || [])
      } catch (err: any) {
        console.warn('library fetch failed', err?.message ?? err)
        setError(err?.message ?? 'Failed to load library')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return { history, watchLater, playlists, loading, error }
}

function VideoCard({ v }: { v: LibraryVideo }) {
  return (
    <article className="group bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-200 transform hover:scale-[1.02]">
      <div className="relative">
        <div className="relative aspect-video">
          <img 
            src={v.thumbnailUrl || 'https://via.placeholder.com/320x180/374151/9CA3AF?text=Video'} 
            alt={v.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://via.placeholder.com/320x180/374151/9CA3AF?text=Video'
            }}
          />
          {v.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
              {v.duration}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors duration-200 mb-2">
          {v.title}
        </h4>
        <div className="flex items-center space-x-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {v.channel?.charAt(0).toUpperCase() || 'C'}
            </span>
          </div>
          <p className="text-xs text-gray-400 truncate">{v.channel}</p>
        </div>
        <p className="text-xs text-gray-500">{v.views} • {v.published}</p>
      </div>
    </article>
  )
}

function PlaylistRow({ p }: { p: PlaylistItem }) {
  return (
    <div className="flex items-start space-x-4 p-2 rounded-lg hover:bg-gray-800">
      <div className="relative flex-shrink-0">
        <img className="w-40 h-24 object-cover rounded-lg" src={p.coverUrl} />
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
          <span className="material-icons text-white text-3xl">playlist_play</span>
          <p className="text-white font-semibold text-sm mt-1">{p.count ?? 0} videos</p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-base">{p.title}</h4>
        <p className="text-sm text-gray-400">{p.owner}</p>
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const { history, watchLater, playlists, loading, error } = useLibrary()

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 main-content ml-60">
        <header className="flex justify-between items-center mb-8">
          <div className="w-1/2">
            <div className="relative">
              <input className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Search in your library..." type="text" />
              <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <span className="material-icons text-gray-300 hover:text-white cursor-pointer">videocam</span>
            <span className="material-icons text-gray-300 hover:text-white cursor-pointer">notifications</span>
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white">S</div>
          </div>
        </header>

        <h2 className="text-3xl font-bold mb-8">Library</h2>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold flex items-center"><span className="material-icons mr-3">history</span>History</h3>
            <a className="text-purple-400 hover:text-purple-300 font-semibold" href="#">See all</a>
          </div>

          {loading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : history.length === 0 ? (
            <div className="col-span-full text-sm text-gray-400">No history found. Implement <code>/api/user/library</code>.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {history.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center"><span className="material-icons mr-3">watch_later</span>Watch Later</h3>
              <a className="text-purple-400 hover:text-purple-300 font-semibold" href="#">See all</a>
            </div>

            {loading ? (
              <div className="text-sm text-gray-400">Loading...</div>
            ) : watchLater.length === 0 ? (
              <div className="text-sm text-gray-400">No saved videos. Implement <code>/api/user/library</code>.</div>
            ) : (
              <div className="space-y-4">
                {watchLater.map((v) => (
                  <div key={v.id} className="flex items-start space-x-4 p-2 rounded-lg hover:bg-gray-800">
                    <div className="relative flex-shrink-0">
                      <img className="w-40 h-24 object-cover rounded-lg" src={v.thumbnailUrl} />
                      <span className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">{v.duration}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">{v.title}</h4>
                      <p className="text-sm text-gray-400">{v.channel}</p>
                      <p className="text-sm text-gray-400">{v.views} • {v.published}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold flex items-center"><span className="material-icons mr-3">playlist_play</span>Playlists</h3>
              <a className="text-purple-400 hover:text-purple-300 font-semibold" href="#">See all</a>
            </div>

            {loading ? (
              <div className="text-sm text-gray-400">Loading...</div>
            ) : playlists.length === 0 ? (
              <div className="text-sm text-gray-400">No playlists found. Implement <code>/api/user/library</code>.</div>
            ) : (
              <div className="space-y-4">
                {playlists.map((p) => (
                  <PlaylistRow key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
