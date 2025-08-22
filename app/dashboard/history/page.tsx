'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export interface HistoryVideo {
  id: string
  title: string
  channelTitle?: string
  channelId?: string
  thumbnailUrl?: string
  duration?: string
  watchedAt: string
  watchProgress?: number // percentage of video watched
  views?: string
  published?: string
}

function useWatchHistory() {
  const [videos, setVideos] = useState<HistoryVideo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/watch-history')
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((d) => setVideos(d.videos || []))
      .catch((e) => {
        console.warn('failed to load watch history', e?.message || e)
        setVideos([])
      })
      .finally(() => setLoading(false))
  }, [])

  const clearHistory = async () => {
    try {
      const res = await fetch('/api/watch-history', { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setVideos([])
    } catch (e) {
      console.warn('failed to clear history', (e as any)?.message || e)
    }
  }

  const removeVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/watch-history?videoId=${encodeURIComponent(videoId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
    } catch (e) {
      console.warn('failed to remove history item', (e as any)?.message || e)
    }
  }

  return { videos, loading, clearHistory, removeVideo }
}

function HistoryVideoTile({ video, onRemove }: { video: HistoryVideo; onRemove: (id: string) => void }) {
  const formatWatchedAt = (watchedAt: string) => {
    const date = new Date(watchedAt)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <article className="group flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-800/50 transition-all duration-200 border border-transparent hover:border-gray-700">
      <Link href={`/watch?v=${video.id}`} className="flex-shrink-0 relative">
        <img 
          src={video.thumbnailUrl || 'https://via.placeholder.com/160x90/374151/9CA3AF?text=Video'} 
          alt={video.title}
          className="rounded-lg w-40 h-24 object-cover transform group-hover:scale-105 transition-transform duration-300" 
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://via.placeholder.com/160x90/374151/9CA3AF?text=Video'
          }}
        />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {video.duration}
        </div>
        {video.watchProgress && video.watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-600 h-1 rounded-b-lg">
            <div 
              className="bg-purple-500 h-full rounded-b-lg transition-all duration-300"
              style={{ width: `${video.watchProgress}%` }}
            />
          </div>
        )}
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <Link href={`/watch?v=${video.id}`}>
              <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-purple-400 transition-colors duration-200">
                {video.title}
              </h3>
            </Link>
            <div className="flex items-center space-x-2 mb-1">
              {video.channelId && (
                <Link
                  href={`/dashboard/channel/${video.channelId}`}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs font-bold text-white">
                    {video.channelTitle?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </Link>
              )}
              {video.channelId ? (
                <Link
                  href={`/dashboard/channel/${video.channelId}`}
                  className="text-sm text-gray-400 truncate hover:text-purple-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {video.channelTitle}
                </Link>
              ) : (
                <span className="text-sm text-gray-400 truncate">
                  {video.channelTitle}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>{video.views}</span>
              <span>•</span>
              <span>{video.published}</span>
              <span>•</span>
              <span>Watched {formatWatchedAt(video.watchedAt)}</span>
            </div>
          </div>
          
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove(video.id)
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all duration-200 p-1.5 rounded-lg hover:bg-red-900/20"
            aria-label="Remove from history"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export default function HistoryPage() {
  const { videos, loading, clearHistory, removeVideo } = useWatchHistory()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredVideos, setFilteredVideos] = useState<HistoryVideo[]>([])

  useEffect(() => {
    if (!searchQuery) {
      setFilteredVideos(videos)
    } else {
      setFilteredVideos(
        videos.filter(video => 
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.channelTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }
  }, [videos, searchQuery])

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 main-content ml-60">
        <header className="flex justify-between items-center mb-8">
          <div className="w-1/2">
            <div className="relative">
              <input 
                className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                placeholder="Search watch history..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className="material-icons text-purple-400 text-3xl mr-3">history</span>
            <h2 className="text-3xl font-bold">Watch History</h2>
          </div>
          
          {videos.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              <span className="material-icons text-lg">delete_sweep</span>
              <span>Clear All History</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="animate-pulse flex items-start space-x-4 p-4">
                <div className="bg-gray-800 rounded-lg w-40 h-24" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-800 rounded w-3/4" />
                  <div className="h-4 bg-gray-800 rounded w-1/2" />
                  <div className="h-4 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-16">
            {searchQuery ? (
              <div>
                <span className="material-icons text-gray-600 text-6xl mb-4 block">search_off</span>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                <p className="text-gray-500">Try adjusting your search terms</p>
              </div>
            ) : (
              <div>
                <span className="material-icons text-gray-600 text-6xl mb-4 block">history</span>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No watch history yet</h3>
                <p className="text-gray-500 mb-6">Videos you watch will appear here</p>
                <Link 
                  href="/" 
                  className="inline-flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  <span className="material-icons">explore</span>
                  <span>Start Exploring</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVideos.map((video) => (
              <HistoryVideoTile 
                key={`${video.id}-${video.watchedAt}`} 
                video={video} 
                onRemove={removeVideo}
              />
            ))}
          </div>
        )}

        {!loading && filteredVideos.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Showing {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} in your history
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
