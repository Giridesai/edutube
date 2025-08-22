// Types for our API responses
export interface ApiVideo {
  id: string
  title: string
  channelTitle?: string
  channelId?: string
  thumbnailUrl?: string
  duration?: string
  publishedAt?: string
  description?: string
  viewCount?: number
  likeCount?: number
  summary?: string
  keyPoints?: string[]
  difficulty?: string
  subject?: string
}

export interface ApiEducator {
  id: string
  name: string
  handle?: string
  avatarUrl?: string
  channelId?: string
  description?: string
  verified: boolean
  subscriberCount?: number
  videoCount?: number
  createdAt: Date
}

export interface ApiUser {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
}

// API Response types
export interface YouTubeSearchResponse {
  videos: ApiVideo[]
}

export interface EducatorsResponse {
  educators: ApiEducator[]
}

export interface VideoSummaryResponse {
  summary: string
  keyPoints: string[]
  difficulty: string
  subject: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface ApiQuiz {
  [x: string]: any
  questions: QuizQuestion[]
}

export interface ApiNotes {
  title: string
  content: string
  keyPoints: string[]
}

// Video Interaction types
export interface VideoInteractionResponse {
  userInteractions: {
    liked: boolean
    saved: boolean
    bookmarked: boolean
  }
  counts: {
    likes: number
    saves: number
    bookmarks: number
  }
}

export interface VideoInteractionRequest {
  type: 'like' | 'save' | 'bookmark'
  action?: 'add' | 'remove' | 'toggle'
}

// Playlist types
export interface ApiPlaylist {
  id: string
  title: string
  description?: string
  isPublic: boolean
  videoCount: number
  containsVideo?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PlaylistVideoRequest {
  playlistIds: string[] | string
  action?: 'add' | 'remove'
}

export interface CreatePlaylistRequest {
  title: string
  description?: string
  isPublic?: boolean
}

// Share types
export interface ShareDataResponse {
  shareData: {
    title: string
    description?: string
    url: string
    thumbnail?: string
    metadata: {
      videoId: string
      channelTitle?: string
      duration?: number
    }
    social: {
      twitter: string
      facebook: string
      linkedin: string
      whatsapp: string
      telegram: string
      email: string
    }
  }
}

export interface ShareEventRequest {
  platform: string
  timestamp?: string
}

// Request body types
export interface CreateEducatorRequest {
  name: string
  handle?: string
  avatarUrl?: string
  channelId?: string
  description?: string
}

export interface WatchHistoryRequest {
  userId: string
  videoId: string
  watchTime: number
  completed: boolean
}
