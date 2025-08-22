'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'

export interface ChannelVideo {
  id: string
  title: string
  thumbnailUrl?: string
  duration?: string
  views?: string
  published?: string
  // added for sorting
  viewCount?: number
  publishedAt?: string | null
}

export interface ChannelProfile {
  id: string
  name: string
  handle?: string
  avatarUrl?: string
  bannerUrl?: string
  subscribers?: string
  videoCount?: number
  description?: string
}

// New: Playlist and About types
interface ChannelPlaylist {
  id: string
  title: string
  description?: string
  thumbnailUrl?: string
  itemCount?: number
  publishedAt?: string | null
}

interface ChannelAbout {
  description?: string
  subscribers?: string
  videoCount?: number
  viewCount?: number
  publishedAt?: string | null
  bannerUrl?: string
  avatarUrl?: string
  handle?: string | null
  name?: string
}

function useChannelData(channelId?: string, sort: 'latest' | 'popular' | 'oldest' = 'latest') {
  const [profile, setProfile] = useState<ChannelProfile | null>(null)
  const [videos, setVideos] = useState<ChannelVideo[]>([])
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!channelId) return
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/channel/${encodeURIComponent(channelId)}?sort=${sort}`)
        if (!res.ok) throw new Error(await res.text())
        const json = await res.json()
        setProfile(json.profile ?? null)
        setVideos(json.videos ?? [])
        setSubscribed(!!json.subscription?.subscribed)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load channel')
      } finally {
        setLoading(false)
      }
    })()
  }, [channelId, sort])

  return { profile, videos, subscribed, setSubscribed, loading, error }
}

function VideoCard({ v }: { v: ChannelVideo }) {
  return (
    <Link href={`/watch?v=${v.id}`}>
      <article className="group cursor-pointer bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-200 transform hover:scale-[1.02]">
        <div className="relative">
          <div className="relative aspect-video">
            <img 
              alt={v.title} 
              src={v.thumbnailUrl || 'https://via.placeholder.com/320x180/374151/9CA3AF?text=Video'} 
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
            
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-200">
                <span className="material-icons text-white text-2xl ml-1">play_arrow</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-purple-400 transition-colors duration-200 mb-2 leading-tight text-gray-200">
            {v.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center space-x-1">
              <span className="material-icons text-xs">visibility</span>
              <span>{v.views}</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="material-icons text-xs">schedule</span>
              <span>{v.published}</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}

export default function ChannelPage() {
  const params = useParams() as { id?: string }
  const router = useRouter()
  const channelId = params?.id

  const [sort, setSort] = useState<'latest' | 'popular' | 'oldest'>('latest')
  const { profile, videos, subscribed, setSubscribed, loading, error } = useChannelData(channelId, sort)

  // Tabs: videos | playlists | about
  const [activeTab, setActiveTab] = useState<'videos' | 'playlists' | 'about'>('videos')
  const [playlists, setPlaylists] = useState<ChannelPlaylist[]>([])
  const [playlistsLoaded, setPlaylistsLoaded] = useState(false)
  const [about, setAbout] = useState<ChannelAbout | null>(null)
  const [aboutLoaded, setAboutLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch playlists on demand
  useEffect(() => {
    if (activeTab !== 'playlists' || !channelId || playlistsLoaded) return
    ;(async () => {
      try {
        const res = await fetch(`/api/channel/${encodeURIComponent(channelId)}/playlists`)
        if (res.ok) {
          const json = await res.json()
          setPlaylists(json.playlists || [])
          setPlaylistsLoaded(true)
        }
      } catch {}
    })()
  }, [activeTab, channelId, playlistsLoaded])

  // Fetch about on demand
  useEffect(() => {
    if (activeTab !== 'about' || !channelId || aboutLoaded) return
    ;(async () => {
      try {
        const res = await fetch(`/api/channel/${encodeURIComponent(channelId)}/about`)
        if (res.ok) {
          const json = await res.json()
          setAbout(json.about || null)
          setAboutLoaded(true)
        }
      } catch {}
    })()
  }, [activeTab, channelId, aboutLoaded])

  const toggleSubscribe = async () => {
    if (!channelId || submitting) return
    setSubmitting(true)
    try {
      const method = subscribed ? 'DELETE' : 'POST'
      const res = await fetch(`/api/channel/${encodeURIComponent(channelId)}/subscribe`, { method })
      if (res.status === 401) {
        router.push('/auth/signin')
        return
      }
      if (!res.ok) throw new Error(await res.text())
      setSubscribed(!subscribed)
    } catch (e) {
      // no-op UI error for brevity
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 main-content ml-60">
          <div className="animate-pulse">
            {/* Banner skeleton */}
            <div className="w-full h-48 bg-gray-700 rounded-lg mb-8" />
            
            {/* Profile skeleton */}
            <div className="flex items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-gray-700 mr-6 -mt-16" />
              <div className="space-y-2">
                <div className="h-8 bg-gray-700 rounded w-48" />
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-4 bg-gray-700 rounded w-40" />
              </div>
            </div>
            
            {/* Videos skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="bg-gray-700 rounded-lg w-full h-40" />
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 main-content ml-60">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="material-icons text-red-400 text-2xl">error</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Channel Not Found</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <span className="material-icons">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 main-content ml-60">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-6">
          <Link href="/dashboard" className="hover:text-white transition-colors flex items-center space-x-1">
            <span className="material-icons text-sm">home</span>
            <span>Dashboard</span>
          </Link>
          <span className="material-icons text-xs">chevron_right</span>
          <span className="text-white">Channel</span>
          <span className="material-icons text-xs">chevron_right</span>
          <span className="text-purple-400 font-medium">{profile?.name}</span>
        </nav>

        {/* Banner */}
        <div 
          className="w-full h-48 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg mb-8 overflow-hidden relative"
          style={{ 
            backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : undefined, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center' 
          }}
        >
          {!profile?.bannerUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="material-icons text-white text-6xl mb-2 opacity-50">video_library</span>
                <p className="text-white text-lg font-medium opacity-75">{profile?.name}</p>
              </div>
            </div>
          )}
          {/* Subtle gradient overlay to ensure foreground contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Channel Header Card */}
        <section aria-label="Channel header" className="relative -mt-12 mb-8">
          <div className="relative bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-800 p-6 pl-28 flex items-start">
            {/* Avatar */}
            <div className="absolute -top-10 left-6">
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile?.name ?? 'Channel avatar'}
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full ring-4 ring-gray-900/80 border border-gray-700 bg-gray-800 object-cover"
                />
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-3xl md:text-4xl ring-4 ring-gray-900/80 border border-gray-700">
                  {(profile?.name?.[0] ?? 'C').toUpperCase()}
                </div>
              )}
            </div>

            {/* Main info */}
            <div className="flex-1 pr-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 truncate">{profile?.name ?? 'Channel'}</h1>
              {profile?.handle && (
                <p className="text-gray-400 text-sm md:text-base mb-2 truncate">{profile.handle}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-400 text-xs md:text-sm mb-3">
                <span>{profile?.subscribers ?? '0 subscribers'}</span>
                <span>•</span>
                <span>{profile?.videoCount ?? 0} videos</span>
              </div>
              {profile?.description && (
                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3 md:max-w-3xl">
                  {profile.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                onClick={toggleSubscribe}
                disabled={submitting}
                className={`${subscribed ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} text-white font-semibold py-2 px-4 md:px-6 rounded-full transition-colors duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl`}
              >
                <span className="material-icons text-sm">{subscribed ? 'notifications_active' : 'notifications'}</span>
                <span className="hidden sm:inline">{subscribed ? 'Subscribed' : 'Subscribe'}</span>
              </button>
              <button 
                onClick={() => window.open(`https://www.youtube.com/channel/${channelId}`, '_blank')}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-3 md:px-4 rounded-full transition-colors duration-200 flex items-center space-x-2 border border-gray-700 hover:border-gray-600"
                title="View on YouTube"
              >
                <span className="material-icons text-sm">open_in_new</span>
                <span className="hidden lg:inline">View on YouTube</span>
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-3 md:px-4 rounded-full transition-colors duration-200 border border-gray-700 hover:border-gray-600">
                <span className="material-icons">share</span>
              </button>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="flex space-x-8 -mb-px">
            <button onClick={() => setActiveTab('videos')} className={`font-semibold py-4 px-1 flex items-center space-x-2 transition-colors ${activeTab === 'videos' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
              <span className="material-icons text-sm">play_circle</span>
              <span>Videos</span>
              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full ml-1">{videos.length}</span>
            </button>
            <button onClick={() => setActiveTab('playlists')} className={`font-semibold py-4 px-1 flex items-center space-x-2 transition-colors ${activeTab === 'playlists' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
              <span className="material-icons text-sm">playlist_play</span>
              <span>Playlists</span>
            </button>
            <button onClick={() => setActiveTab('about')} className={`font-semibold py-4 px-1 flex items-center space-x-2 transition-colors ${activeTab === 'about' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
              <span className="material-icons text-sm">info</span>
              <span>About</span>
            </button>
          </nav>
        </div>

        {/* Content Areas */}
        {activeTab === 'videos' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span className="material-icons text-purple-400">video_library</span>
                <span>Latest Uploads</span>
              </h2>
              {videos.length > 0 && (
                <div className="flex items-center space-x-4">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Most Popular</option>
                    <option value="oldest">Oldest</option>
                  </select>
                  <button className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors">
                    <span className="material-icons text-sm">view_module</span>
                  </button>
                </div>
              )}
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <span className="material-icons text-gray-500 text-2xl">video_library</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No videos yet</h3>
                <p className="text-gray-500 text-sm">
                  This channel hasn't uploaded any videos or they haven't been indexed yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {videos.map((video) => (
                  <VideoCard key={video.id} v={video} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-6">
              <span className="material-icons text-purple-400">playlist_play</span>
              <span>Playlists</span>
            </h2>
            {playlists.length === 0 ? (
              <div className="text-gray-400">No playlists found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {playlists.map(pl => (
                  <article key={pl.id} className="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800">
                    <div className="aspect-video bg-gray-800">
                      {pl.thumbnailUrl ? (
                        <img src={pl.thumbnailUrl} alt={pl.title} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-gray-200 line-clamp-2">{pl.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{pl.itemCount ?? 0} videos</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 mb-4">
              <span className="material-icons text-purple-400">info</span>
              <span>About</span>
            </h2>
            {about ? (
              <div className="space-y-4">
                {about.description && <p className="text-gray-300 whitespace-pre-line">{about.description}</p>}
                <div className="text-sm text-gray-400 space-x-3">
                  {about.subscribers && <span>{about.subscribers}</span>}
                  {typeof about.videoCount === 'number' && <span>• {about.videoCount} videos</span>}
                  {typeof about.viewCount === 'number' && <span>• {about.viewCount.toLocaleString()} views</span>}
                </div>
                {about.publishedAt && (
                  <div className="text-xs text-gray-500">Joined {new Date(about.publishedAt).toLocaleDateString()}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-400">No about information available.</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
