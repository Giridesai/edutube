'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

/**
 * Types
 */
export interface Video {
  id: string
  title: string
  channelTitle?: string
  channelId?: string
  channelThumbnailUrl?: string
  thumbnailUrl?: string
  duration?: string
  publishedAt?: string
  description?: string
  viewCount?: number
  likeCount?: number
  // AI fields (populated by background processing)
  summary?: string
  keyPoints?: string[]
  chapters?: Array<{ start: number; title: string }>
}

/**
 * Integration hooks (placeholders) - implement backend routes:
 * - /api/youtube/search?q=
 * - /api/ai/video-summary?videoId=
 *
 * These hooks are thin wrappers around fetch to encourage real API usage.
 */

function useYouTubeSearch() {
  const [loading, setLoading] = useState(false)
  const [videos, setVideos] = useState<Video[]>([])
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      // Deduplicate search results by ID
      const uniqueVideos = data.videos ? data.videos.filter((video: Video, index: number, self: Video[]) => {
        // Debug logging for problematic video data
        if (!video || typeof video.id !== 'string') {
          console.warn('Found search video with invalid ID:', video)
          return false
        }
        return index === self.findIndex(v => v.id === video.id)
      }) : []
      setVideos(uniqueVideos)
    } catch (err: any) {
      setError(err?.message ?? 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, videos, error, search, setVideos }
}

function useVideoSummary(videoId?: string) {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)

  const fetchSummary = useCallback(
    async (id?: string) => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/ai/video-summary?videoId=${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setSummary(json.summary)
      } catch (e) {
        setSummary(null)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { loading, summary, fetchSummary }
}

function VideoCard({ video }: { video: Video }) {
  // Format view count
  const formatViews = (count?: number) => {
    if (!count) return ''
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${Math.round(count / 1000)}K`
    return count.toString()
  }

  // Format published date
  const formatPublishedAt = (dateString?: string) => {
    if (!dateString) return ''
    const now = new Date()
    const publishedAt = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - publishedAt.getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`
    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) return `${diffInMonths} months ago`
    const diffInYears = Math.floor(diffInDays / 365)
    return `${diffInYears} years ago`
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    // Only navigate if not clicking on channel links
    if (!(e.target as HTMLElement).closest('[data-channel-link]')) {
      window.location.href = `/watch?v=${video.id}`
    }
  }

  return (
    <div className="flex flex-col group cursor-pointer" onClick={handleVideoClick}>
      <div className="relative">
        <img
          src={video.thumbnailUrl ?? 'https://via.placeholder.com/320x180/1F2937/9CA3AF?text=Video'}
          alt={video.title}
          className="w-full h-auto aspect-video object-cover rounded-xl bg-gray-800 group-hover:rounded-none transition-all duration-200"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = 'https://via.placeholder.com/320x180/1F2937/9CA3AF?text=Video'
          }}
        />
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded-md font-mono">
            {video.duration}
          </div>
        )}
      </div>
      <div className="flex items-start mt-3">
        <Link
          href={`/dashboard/channel/${video.channelId}`}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          data-channel-link
          onClick={(e) => e.stopPropagation()}
        >
          <img
            className="w-9 h-9 rounded-full object-cover"
            src={video.channelThumbnailUrl ?? `https://via.placeholder.com/40x40/1F2937/9CA3AF?text=${video.channelTitle?.charAt(0) || 'C'}`}
            alt={video.channelTitle}
          />
        </Link>
        <div className="ml-3 flex-grow">
          <Link href={`/watch?v=${video.id}`} className="block">
            <h3 className="font-semibold text-sm text-gray-100 line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors">
              {video.title}
            </h3>
          </Link>
          <div className="text-xs text-gray-400 mt-1">
            <Link
              href={`/dashboard/channel/${video.channelId}`}
              className="truncate hover:text-purple-400 transition-colors block"
              data-channel-link
              onClick={(e) => e.stopPropagation()}
            >
              {video.channelTitle}
            </Link>
            <div className="flex items-center">
              <span>{formatViews(video.viewCount)} views</span>
              <span className="mx-1">•</span>
              <span>{formatPublishedAt(video.publishedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { loading, videos, error, search, setVideos } = useYouTubeSearch()
  const [query, setQuery] = useState('')
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    // Fetch trending tech/programming videos on mount
    const fetchTrendingVideos = async () => {
      setInitialLoading(true)
      try {
        const response = await fetch('/api/youtube/trending')
        if (response.ok) {
          const data = await response.json()
          console.log('API Response data:', data)
          
          // Deduplicate videos by ID to prevent duplicates
          const uniqueVideos = data.videos ? data.videos.filter((video: Video, index: number, self: Video[]) => {
            // Debug logging for problematic video data
            if (!video || typeof video.id !== 'string') {
              console.warn('Found video with invalid ID:', video)
              return false
            }
            return index === self.findIndex(v => v.id === video.id)
          }) : []
          
          console.log('Processed videos:', uniqueVideos.slice(0, 3)) // Log first 3 videos
          setVideos(uniqueVideos)
          
          // Show message if using sample data
          if (data.message) {
            console.log('API Message:', data.message)
          }
        } else if (response.status === 503) {
          // API overloaded
          const errorData = await response.json().catch(() => ({}))
          console.error('API Error:', errorData.error || 'Service unavailable')
          setVideos([])
        } else {
          // Other errors - try fallback
          const fallbackResponse = await fetch('/api/youtube/search?q=programming tutorial javascript python react')
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json()
            const uniqueFallbackVideos = fallbackData.videos ? fallbackData.videos.filter((video: Video, index: number, self: Video[]) => {
              if (!video || typeof video.id !== 'string') {
                console.warn('Found fallback video with invalid ID:', video)
                return false
              }
              return index === self.findIndex(v => v.id === video.id)
            }) : []
            setVideos(uniqueFallbackVideos)
          }
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error)
        // Try one more fallback
        try {
          const response = await fetch('/api/youtube/search?q=coding tutorial')
          if (response.ok) {
            const data = await response.json()
            const uniqueVideos = data.videos ? data.videos.filter((video: Video, index: number, self: Video[]) => {
              if (!video || typeof video.id !== 'string') {
                console.warn('Found error fallback video with invalid ID:', video)
                return false
              }
              return index === self.findIndex(v => v.id === video.id)
            }) : []
            setVideos(uniqueVideos)
          }
        } catch (fallbackError) {
          console.error('All video fetch attempts failed:', fallbackError)
        }
      } finally {
        setInitialLoading(false)
      }
    }

    fetchTrendingVideos()
  }, [setVideos])

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      if (!query) return
      search(query)
    },
    [query, search]
  )

  return (
    <main className="flex-1 p-8" aria-live="polite">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <form className="w-full md:w-1/2" onSubmit={handleSearch} role="search" aria-label="Search videos">
          <div className="relative">
            <input
              aria-label="Search for educational videos"
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 px-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search for educational videos..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              aria-label="Search"
            >
              <span className="material-icons">search</span>
            </button>
          </div>
        </form>

        <div className="flex items-center space-x-6">
          <button aria-label="Upload video" className="text-gray-300 hover:text-white">
            <span className="material-icons">videocam</span>
          </button>
          <button aria-label="Notifications" className="text-gray-300 hover:text-white">
            <span className="material-icons">notifications</span>
          </button>
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <span className="material-icons text-purple-400 text-2xl mr-2">trending_up</span>
            <h2 className="text-2xl font-bold">Trending Programming</h2>
            <span className="ml-2 bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full border border-red-500/30">
              🔥 Hot
            </span>
          </div>
          <button
            onClick={() => {
              setInitialLoading(true)
              fetch('/api/youtube/trending')
                .then(res => res.json())
                .then(data => {
                  const uniqueVideos = data.videos ? data.videos.filter((video: Video, index: number, self: Video[]) => {
                    if (!video || typeof video.id !== 'string') {
                      console.warn('Found refresh video with invalid ID:', video)
                      return false
                    }
                    return index === self.findIndex(v => v.id === video.id)
                  }) : []
                  setVideos(uniqueVideos)
                  setInitialLoading(false)
                })
                .catch(() => setInitialLoading(false))
            }}
            className="flex items-center space-x-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-500/30 hover:border-purple-500/50 transition-all duration-200"
            disabled={loading || initialLoading}
          >
            <span className="material-icons text-sm">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
        
        {/* Sample content notice */}
        {!loading && !initialLoading && videos.length > 0 && 
         typeof videos[0]?.id === 'string' && videos[0].id.startsWith('sample-') && (
          <div className="mb-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-blue-400 text-sm">
              <span className="material-icons text-sm">info</span>
              <span>Showing sample programming content</span>
              <span className="text-blue-300">•</span>
              <span className="text-blue-300">Configure YouTube API for live data</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {(loading || initialLoading) &&
            Array.from({ length: 10 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="animate-pulse">
                <div className="bg-gray-800 rounded-lg w-full h-40" />
                <div className="h-4 mt-2 bg-gray-800 rounded w-3/4" />
                <div className="h-3 mt-1 bg-gray-800 rounded w-1/2" />
              </div>
            ))}

          {!loading && !initialLoading && videos.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <span className="material-icons text-gray-500 text-2xl">code</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">
                {error ? 'Failed to load videos' : 'No programming videos found'}
              </p>
              <p className="text-gray-500 text-xs">
                {error 
                  ? 'Please check your YouTube API configuration and try again' 
                  : 'Try searching for specific programming topics'
                }
              </p>
              {error && (
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {!loading && !initialLoading &&
            videos.map((v, index) => (
              <div key={`video-${String(v.id || index)}-${index}`} className="relative">
                {index < 3 && ( // Show rank for top 3 trending videos
                  <div className="absolute -top-2 -left-2 z-10 w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {index + 1}
                  </div>
                )}
                <VideoCard video={v} />
              </div>
            ))}
        </div>
      </section>
    </main>
  )
}