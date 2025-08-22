import { google } from 'googleapis'
import { getOrSetCache, cacheManager, cacheConfigs } from './cache-manager'
import { prisma } from './database'

// API Key Management Interface
interface APIKeyInfo {
  key: string
  quotaUsed: number
  requestCount: number
  lastResetTime: number
  isActive: boolean
  failureCount: number
  lastFailureTime: number
}

interface RateLimitInfo {
  count: number
  resetTime: number
}

interface QuotaUsage {
  used: number
  resetTime: number
}

// Rate limiting and quota constants
const RATE_LIMITS = {
  requestsPerMinute: 100,
  dailyQuotaLimit: 10000,
}

const QUOTA_COSTS = {
  search: 100,
  video: 1,
  channel: 1,
  playlist: 1,
  comments: 1,
}

class YouTubeAPIServiceMultiKey {
  private youtubeInstances: Map<string, any> = new Map()
  private apiKeys: APIKeyInfo[] = []
  private currentKeyIndex: number = 0
  private rateLimitMap = new Map<string, RateLimitInfo>()
  private rotationEnabled: boolean = true

  constructor() {
    this.initializeAPIKeys()
    this.rotationEnabled = process.env.YOUTUBE_API_ROTATION_ENABLED === 'true'
    
    // Initialize YouTube instances for each API key
    this.apiKeys.forEach((keyInfo, index) => {
      if (keyInfo.key && keyInfo.key !== 'your_youtube_api_key_X_here') {
        const youtube = google.youtube({
          version: 'v3',
          auth: keyInfo.key,
        })
        this.youtubeInstances.set(keyInfo.key, youtube)
      }
    })

    // Log initialization
    console.log(`🔑 Initialized YouTube API service with ${this.youtubeInstances.size} active API keys`)
  }

  /**
   * Initialize API keys from environment variables
   */
  private initializeAPIKeys(): void {
    const keyCount = 8 // Support up to 8 keys
    
    for (let i = 1; i <= keyCount; i++) {
      const envKey = `YOUTUBE_API_KEY_${i}`
      const apiKey = process.env[envKey]
      
      if (apiKey && apiKey !== `your_youtube_api_key_${i}_here`) {
        this.apiKeys.push({
          key: apiKey,
          quotaUsed: 0,
          requestCount: 0,
          lastResetTime: this.getNextMidnightPST(),
          isActive: true,
          failureCount: 0,
          lastFailureTime: 0,
        })
      }
    }

    // Fallback to legacy single API key if no multi-keys are configured
    if (this.apiKeys.length === 0) {
      const legacyKey = process.env.YOUTUBE_API_KEY
      if (legacyKey && legacyKey !== 'your_primary_youtube_api_key_here') {
        this.apiKeys.push({
          key: legacyKey,
          quotaUsed: 0,
          requestCount: 0,
          lastResetTime: this.getNextMidnightPST(),
          isActive: true,
          failureCount: 0,
          lastFailureTime: 0,
        })
      }
    }

    if (this.apiKeys.length === 0) {
      console.warn('⚠️ No YouTube API keys configured!')
    }
  }

  /**
   * Get next midnight PST (when YouTube quota resets)
   */
  private getNextMidnightPST(): number {
    const now = new Date()
    const pstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    const tomorrow = new Date(pstTime)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow.getTime()
  }

  /**
   * Get the best available API key for making requests
   */
  private getBestAPIKey(quotaCost: number): APIKeyInfo | null {
    const now = Date.now()

    // Reset quotas if needed
    this.apiKeys.forEach(keyInfo => {
      if (now > keyInfo.lastResetTime) {
        keyInfo.quotaUsed = 0
        keyInfo.requestCount = 0
        keyInfo.lastResetTime = this.getNextMidnightPST()
        keyInfo.failureCount = 0 // Reset failure count on quota reset
      }
    })

    // Filter active keys that can handle the request
    const availableKeys = this.apiKeys.filter(keyInfo => {
      if (!keyInfo.isActive) return false
      
      // Check if key is in cooldown due to failures
      const cooldownTime = 5 * 60 * 1000 // 5 minutes
      if (keyInfo.failureCount >= 3 && (now - keyInfo.lastFailureTime) < cooldownTime) {
        return false
      }

      // Check quota limits
      const quotaLimit = parseInt(process.env.YOUTUBE_API_QUOTA_PER_KEY || '10000')
      if (keyInfo.quotaUsed + quotaCost > quotaLimit) {
        return false
      }

      // Check rate limits
      const rateLimit = parseInt(process.env.YOUTUBE_API_RATE_LIMIT_PER_KEY || '100')
      if (keyInfo.requestCount >= rateLimit) {
        return false
      }

      return true
    })

    if (availableKeys.length === 0) {
      return null
    }

    // Use round-robin if rotation is enabled, otherwise use least used
    if (this.rotationEnabled) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length
      return availableKeys[this.currentKeyIndex]
    } else {
      // Return the key with lowest quota usage
      return availableKeys.reduce((best, current) => 
        current.quotaUsed < best.quotaUsed ? current : best
      )
    }
  }

  /**
   * Get YouTube instance for the given API key
   */
  private getYouTubeInstance(apiKey: string): any {
    return this.youtubeInstances.get(apiKey)
  }

  /**
   * Record a successful API request
   */
  private recordSuccessfulRequest(keyInfo: APIKeyInfo, quotaCost: number): void {
    keyInfo.quotaUsed += quotaCost
    keyInfo.requestCount++
    
    if (process.env.LOG_API_KEY_ROTATION === 'true') {
      console.log(`📊 API Key Usage - Quota: ${keyInfo.quotaUsed}, Requests: ${keyInfo.requestCount}`)
    }
  }

  /**
   * Record a failed API request
   */
  private recordFailedRequest(keyInfo: APIKeyInfo, error: any): void {
    keyInfo.failureCount++
    keyInfo.lastFailureTime = Date.now()
    
    // Disable key if too many failures
    if (keyInfo.failureCount >= 5) {
      keyInfo.isActive = false
      console.warn(`🚫 API key disabled due to repeated failures: ${keyInfo.key.substring(0, 10)}...`)
    }

    console.error(`❌ API request failed for key ${keyInfo.key.substring(0, 10)}...:`, error.message)
  }

  /**
   * Make an API request with automatic key rotation and failover
   */
  private async makeAPIRequest<T>(
    requestFn: (youtube: any) => Promise<T>,
    quotaCost: number,
    operation: string
  ): Promise<T> {
    const maxRetries = parseInt(process.env.API_FAILURE_RETRY_COUNT || '3')
    let lastError: any

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const keyInfo = this.getBestAPIKey(quotaCost)
      
      if (!keyInfo) {
        throw new Error('No available API keys for YouTube requests')
      }

      const youtube = this.getYouTubeInstance(keyInfo.key)
      if (!youtube) {
        continue
      }

      try {
        if (process.env.DEBUG_API_CALLS === 'true') {
          console.log(`🔑 Using API key ${keyInfo.key.substring(0, 10)}... for ${operation}`)
        }

        const result = await requestFn(youtube)
        this.recordSuccessfulRequest(keyInfo, quotaCost)
        return result
      } catch (error: any) {
        lastError = error
        this.recordFailedRequest(keyInfo, error)

        // If it's a quota error, mark this key as exhausted and try another
        if (error.message?.includes('quota') || error.code === 403) {
          keyInfo.quotaUsed = parseInt(process.env.YOUTUBE_API_QUOTA_PER_KEY || '10000')
          continue
        }

        // If it's a rate limit error, wait and try another key
        if (error.code === 429) {
          continue
        }

        // For other errors, don't retry
        break
      }
    }

    throw lastError || new Error(`Failed to execute ${operation} after ${maxRetries} attempts`)
  }

  /**
   * Get video from database first, then API if needed
   */
  async getVideo(videoId: string): Promise<any> {
    try {
      // Check database first
      const dbVideo = await prisma.video.findUnique({
        where: { id: videoId },
        include: { educator: true },
      })

      if (dbVideo) {
        console.log(`Video ${videoId} found in database`)
        return this.formatVideoFromDB(dbVideo)
      }

      // Use cache manager with database and memory caching
      const cacheKey = `video:${videoId}`
      return await getOrSetCache(
        cacheKey,
        async () => {
          console.log(`Fetching video ${videoId} from YouTube API`)
          
          const response = await this.makeAPIRequest(
            (youtube) => youtube.videos.list({
              part: ['snippet', 'statistics', 'contentDetails'],
              id: [videoId],
            }),
            QUOTA_COSTS.video,
            'getVideo'
          ) as any

          if (!response.data.items || response.data.items.length === 0) {
            throw new Error('Video not found')
          }

          const video = response.data.items[0]
          const formattedVideo = this.formatVideoFromAPI(video)

          // Save to database for future use
          await this.saveVideoToDB(video)

          return formattedVideo
        },
        cacheConfigs.video
      )
    } catch (error: any) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw error
      }
      console.error('Error fetching video:', error)
      throw new Error('Failed to fetch video details')
    }
  }

  /**
   * Search videos with intelligent caching and database lookup
   */
  async searchVideos(query: string, maxResults: number = 20): Promise<any[]> {
    try {
      const cacheKey = `search:${query}:${maxResults}`
      
      return await getOrSetCache(
        cacheKey,
        async () => {
          // Optimize search parameters to reduce quota usage
          const enhancedQuery = this.enhanceSearchQuery(query)
          
          console.log(`Searching YouTube API for: ${enhancedQuery}`)
          const searchResponse = await this.makeAPIRequest(
            (youtube) => youtube.search.list({
              part: ['snippet'],
              q: enhancedQuery,
              type: ['video'],
              maxResults: Math.min(maxResults * 2, 50), // Get more to filter shorts
              order: 'relevance',
              safeSearch: 'strict',
              videoDuration: 'medium',
            }),
            QUOTA_COSTS.search,
            'searchVideos'
          ) as any

          if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            return await this.getVideosByQueryFromDB(query, maxResults)
          }

          // Get video details in batch to reduce API calls
          const videoIds = searchResponse.data.items
            .map((item: any) => item.id?.videoId)
            .filter(Boolean)
            .slice(0, 25) // Limit to 25 to save quota

          const channelIds = [...new Set(searchResponse.data.items
            .map((item: any) => item.snippet?.channelId)
            .filter(Boolean))]

          let videos: any[] = []
          const channelThumbnails = new Map<string, string>()

          if (channelIds.length > 0) {
            try {
              const channelResponse = await this.makeAPIRequest(
                (youtube) => youtube.channels.list({
                  part: ['snippet'],
                  id: channelIds,
                }),
                QUOTA_COSTS.channel,
                'getChannels'
              ) as any
              
              channelResponse.data.items?.forEach((channel: any) => {
                if (channel.id && channel.snippet?.thumbnails?.default?.url) {
                  channelThumbnails.set(channel.id, channel.snippet.thumbnails.default.url)
                }
              })
            } catch (error: any) {
              console.warn('Failed to fetch channel thumbnails:', error.message)
            }
          }
          
          if (videoIds.length > 0) {
            try {
              const videoResponse = await this.makeAPIRequest(
                (youtube) => youtube.videos.list({
                  part: ['contentDetails', 'statistics'],
                  id: videoIds,
                }),
                QUOTA_COSTS.video,
                'getVideoDetails'
              ) as any

              const combinedVideos = this.combineSearchWithVideoData(searchResponse.data.items, videoResponse.data.items || [])
                .filter(video => this.isValidEducationalVideo(video))
                .slice(0, maxResults)

              // Format videos for frontend consumption
              videos = combinedVideos.map(video => this.formatVideoFromAPI(video, channelThumbnails.get(video.snippet?.channelId)))

              // Save videos to database for future use
              for (const video of combinedVideos) {
                await this.saveVideoToDB(video, true, channelThumbnails.get(video.snippet?.channelId)).catch(console.error)
              }
            } catch (error: any) {
              console.warn('Failed to fetch video details:', error.message)
            }
          }

          return videos
        },
        cacheConfigs.search
      )
    } catch (error: any) {
      console.error('Error searching videos:', error)
      // Fallback to database
      return await this.getVideosByQueryFromDB(query, maxResults)
    }
  }

  /**
   * Get current quota information across all API keys
   */
  getQuotaInfo(): {
    totalUsed: number
    totalLimit: number
    totalRemaining: number
    resetTime: number
    keyDetails: Array<{
      keyId: string
      used: number
      limit: number
      remaining: number
      isActive: boolean
      failureCount: number
    }>
  } {
    const keyLimit = parseInt(process.env.YOUTUBE_API_QUOTA_PER_KEY || '10000')
    const totalLimit = this.apiKeys.length * keyLimit
    const totalUsed = this.apiKeys.reduce((sum, key) => sum + key.quotaUsed, 0)
    
    return {
      totalUsed,
      totalLimit,
      totalRemaining: totalLimit - totalUsed,
      resetTime: this.getNextMidnightPST(),
      keyDetails: this.apiKeys.map((key, index) => ({
        keyId: `key_${index + 1}`,
        used: key.quotaUsed,
        limit: keyLimit,
        remaining: keyLimit - key.quotaUsed,
        isActive: key.isActive,
        failureCount: key.failureCount,
      }))
    }
  }

  /**
   * Reset all API key quotas (for testing)
   */
  resetQuotas(): void {
    this.apiKeys.forEach(key => {
      key.quotaUsed = 0
      key.requestCount = 0
      key.failureCount = 0
      key.isActive = true
      key.lastResetTime = this.getNextMidnightPST()
    })
    console.log('🔄 All API key quotas reset')
  }

  // ... Rest of the methods remain the same as the original service
  // (Helper methods like enhanceSearchQuery, isValidEducationalVideo, etc.)
  
  private enhanceSearchQuery(query: string): string {
    const techKeywords = ['programming', 'coding', 'development', 'tutorial', 'course', 'explained', 'guide', 'learn']
    const hasKeyword = techKeywords.some(keyword => query.toLowerCase().includes(keyword))
    return hasKeyword ? query : `${query} programming tutorial`
  }

  private isValidEducationalVideo(video: any): boolean {
    const duration = this.parseISO8601Duration(video.contentDetails?.duration || 'PT0S')
    return duration > 60 && duration < 7200 // Between 1 minute and 2 hours
  }

  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    
    return hours * 3600 + minutes * 60 + seconds
  }

  private combineSearchWithVideoData(searchItems: any[], videoItems: any[]): any[] {
    return searchItems.map((searchItem: any) => {
      const videoData = videoItems.find(video => video.id === searchItem.id?.videoId)
      return {
        ...searchItem,
        statistics: videoData?.statistics,
        contentDetails: videoData?.contentDetails,
      }
    })
  }

  private formatVideoFromDB(dbVideo: any): any {
    return {
      id: dbVideo.id,
      title: dbVideo.title,
      channelTitle: dbVideo.channelTitle || dbVideo.educator?.name,
      channelId: dbVideo.educator?.channelId || '',
      channelThumbnailUrl: dbVideo.channelThumbnailUrl,
      description: dbVideo.description || '',
      thumbnailUrl: dbVideo.thumbnailUrl || '',
      duration: this.formatDuration(dbVideo.duration || 0),
      views: this.formatViewCount(dbVideo.viewCount?.toString() || '0'),
      likes: dbVideo.likeCount?.toString() || '0',
      published: this.formatPublishedDate(dbVideo.publishedAt?.toISOString() || ''),
      tags: dbVideo.tags ? JSON.parse(dbVideo.tags) : [],
      summary: dbVideo.summary,
      keyPoints: dbVideo.keyPoints ? JSON.parse(dbVideo.keyPoints) : [],
    }
  }

  private formatVideoFromAPI(video: any, channelThumbnailUrl?: string): any {
    const snippet = video.snippet
    const statistics = video.statistics
    const contentDetails = video.contentDetails
    const durationInSeconds = this.parseISO8601Duration(contentDetails?.duration || 'PT0S')

    // Handle both direct video API response and combined search data
    const videoId = video.id?.videoId || video.id
    const thumbnailUrl = snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || ''

    return {
      id: videoId,
      title: snippet?.title,
      channelTitle: snippet?.channelTitle,
      channelId: snippet?.channelId,
      channelThumbnailUrl: channelThumbnailUrl,
      description: snippet?.description || '',
      thumbnailUrl: thumbnailUrl,
      duration: this.formatDuration(durationInSeconds),
      views: this.formatViewCount(statistics?.viewCount || '0'),
      likes: statistics?.likeCount || '0',
      published: this.formatPublishedDate(snippet?.publishedAt || snippet?.publishTime),
      publishedAt: snippet?.publishedAt || snippet?.publishTime,
      viewCount: parseInt(statistics?.viewCount || '0'),
      likeCount: parseInt(statistics?.likeCount || '0'),
      tags: snippet?.tags || [],
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  private formatViewCount(count: string): string {
    const num = parseInt(count)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`
    } else {
      return `${num} views`
    }
  }

  private formatPublishedDate(dateString: string): string {
    const publishedDate = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} days ago`
    } else if (diffInHours < 720) {
      return `${Math.floor(diffInHours / 168)} weeks ago`
    } else if (diffInHours < 8760) {
      return `${Math.floor(diffInHours / 720)} months ago`
    } else {
      return `${Math.floor(diffInHours / 8760)} years ago`
    }
  }

  private async saveVideoToDB(video: any, isSearchResult: boolean = false, channelThumbnailUrl?: string): Promise<void> {
    try {
      const videoId = isSearchResult ? video.id?.videoId : video.id
      if (!videoId) return

      const snippet = video.snippet
      const statistics = video.statistics
      const contentDetails = video.contentDetails
      const duration = this.parseISO8601Duration(contentDetails?.duration || 'PT0S')

      // Don't save shorts
      if (duration <= 60) return

      await prisma.video.upsert({
        where: { id: videoId },
        update: {
          title: snippet?.title,
          description: snippet?.description || '',
          thumbnailUrl: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url || '',
          ...(channelThumbnailUrl && { channelThumbnailUrl }),
          duration: duration,
          viewCount: parseInt(statistics?.viewCount || '0'),
          likeCount: parseInt(statistics?.likeCount || '0'),
          publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
          channelTitle: snippet?.channelTitle,
          tags: JSON.stringify(snippet?.tags || []),
        },
        create: {
          id: videoId,
          title: snippet?.title || '',
          description: snippet?.description || '',
          thumbnailUrl: snippet?.thumbnails?.maxres?.url || snippet?.thumbnails?.high?.url || '',
          ...(channelThumbnailUrl && { channelThumbnailUrl }),
          duration: duration,
          viewCount: parseInt(statistics?.viewCount || '0'),
          likeCount: parseInt(statistics?.likeCount || '0'),
          publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
          channelTitle: snippet?.channelTitle || '',
          tags: JSON.stringify(snippet?.tags || []),
          keyPoints: JSON.stringify([]),
        },
      })
    } catch (error) {
      console.error('Error saving video to database:', error)
    }
  }

  private async getVideosByQueryFromDB(query: string, limit: number): Promise<any[]> {
    try {
      const videos = await prisma.video.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { channelTitle: { contains: query } },
          ],
          duration: { gt: 60 }, // Exclude shorts
        },
        include: { educator: true },
        orderBy: { viewCount: 'desc' },
        take: limit,
      })

      return videos.map(video => this.formatVideoFromDB(video))
    } catch (error) {
      console.error('Error getting videos from database:', error)
      return []
    }
  }

  /**
   * Clear cache (useful for development/testing)
   */
  async clearCache(): Promise<void> {
    await cacheManager.clear('youtube')
    console.log('YouTube API cache cleared')
  }
}

// Export the new multi-key service
export const youtubeApiServiceMultiKey = new YouTubeAPIServiceMultiKey()
export default youtubeApiServiceMultiKey
