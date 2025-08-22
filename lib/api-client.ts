// Utility functions for video interactions API calls

import { 
  VideoInteractionResponse, 
  VideoInteractionRequest, 
  PlaylistVideoRequest, 
  CreatePlaylistRequest,
  ShareDataResponse,
  ShareEventRequest,
  ApiPlaylist
} from '@/lib/types'

// Video Interaction API calls
export async function getVideoInteractions(videoId: string): Promise<VideoInteractionResponse> {
  const response = await fetch(`/api/videos/${videoId}/interactions`)
  if (!response.ok) {
    throw new Error('Failed to fetch video interactions')
  }
  return response.json()
}

export async function toggleVideoInteraction(
  videoId: string, 
  request: VideoInteractionRequest
): Promise<any> {
  const response = await fetch(`/api/videos/${videoId}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error('Failed to update video interaction')
  }
  return response.json()
}

// Playlist API calls
export async function getUserPlaylists(): Promise<{ playlists: ApiPlaylist[] }> {
  const response = await fetch('/api/user/playlists')
  if (!response.ok) {
    throw new Error('Failed to fetch user playlists')
  }
  return response.json()
}

export async function getVideoPlaylists(videoId: string): Promise<{ playlists: ApiPlaylist[] }> {
  const response = await fetch(`/api/videos/${videoId}/playlists`)
  if (!response.ok) {
    throw new Error('Failed to fetch video playlists')
  }
  return response.json()
}

export async function createPlaylist(request: CreatePlaylistRequest): Promise<{ playlist: ApiPlaylist }> {
  const response = await fetch('/api/user/playlists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error('Failed to create playlist')
  }
  return response.json()
}

export async function manageVideoInPlaylists(
  videoId: string, 
  request: PlaylistVideoRequest
): Promise<any> {
  const response = await fetch(`/api/videos/${videoId}/playlists`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error('Failed to manage video in playlists')
  }
  return response.json()
}

// Share API calls
export async function getShareData(videoId: string, timestamp?: string): Promise<ShareDataResponse> {
  const url = new URL(`/api/videos/${videoId}/share`, window.location.origin)
  if (timestamp) {
    url.searchParams.set('t', timestamp)
  }
  
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error('Failed to get share data')
  }
  return response.json()
}

export async function trackShareEvent(videoId: string, request: ShareEventRequest): Promise<any> {
  const response = await fetch(`/api/videos/${videoId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    throw new Error('Failed to track share event')
  }
  return response.json()
}

// User interactions
export async function getUserSavedVideos(type: 'like' | 'save' | 'bookmark' | 'all' = 'all'): Promise<any> {
  const response = await fetch(`/api/user/interactions?type=${type}`)
  if (!response.ok) {
    throw new Error('Failed to fetch user saved videos')
  }
  return response.json()
}

// Setup default playlists for new users
export async function setupUserDefaults(): Promise<any> {
  const response = await fetch('/api/user/setup', {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Failed to setup user defaults')
  }
  return response.json()
}

// Utility functions for UI
export function formatShareUrl(shareData: ShareDataResponse['shareData'], platform: string): string {
  return shareData.social[platform as keyof typeof shareData.social] || shareData.url
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for non-HTTPS environments
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'absolute'
    textArea.style.left = '-999999px'
    document.body.prepend(textArea)
    textArea.select()
    document.execCommand('copy')
    textArea.remove()
    return Promise.resolve()
  }
}
