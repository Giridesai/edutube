import { google } from 'googleapis'
import { prisma } from '@/lib/database'
import { cacheManager, cacheConfigs, getOrSetCache } from '@/lib/cache-manager'

// YouTube API quota costs per operation
const QUOTA_COSTS = {
  search: 100,
  video: 5,
  comments: 5,
  channel: 5,
  playlist: 5,
} as const

// Rate limiting configuration
const RATE_LIMITS = {
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  dailyQuotaLimit: 10000,
} as const

interface RateLimitInfo {
  count: number
  resetTime: number
}

interface QuotaUsage {
  used: number
  resetTime: number
}

class YouTubeAPIService {
  private youtube
  private rateLimitMap = new Map<string, RateLimitInfo>()
  private quotaUsage: QuotaUsage = {
    used: 0,
    resetTime: this.getNextMidnightPST(),
  }

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY,
    })
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
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(quotaCost: number, identifier: string = 'global'): boolean {
    const now = Date.now()

    // Reset quota if needed
    if (now > this.quotaUsage.resetTime) {
      this.quotaUsage.used = 0
      this.quotaUsage.resetTime = this.getNextMidnightPST()
    }

    // Check daily quota
    if (this.quotaUsage.used + quotaCost > RATE_LIMITS.dailyQuotaLimit) {
      console.warn(`YouTube API quota would be exceeded. Used: ${this.quotaUsage.used}, Cost: ${quotaCost}, Limit: ${RATE_LIMITS.dailyQuotaLimit}`)
      return false
    }

    // Check rate limit
    const rateLimit = this.rateLimitMap.get(identifier) || { count: 0, resetTime: now + 60000 }
    
    if (now > rateLimit.resetTime) {
      rateLimit.count = 0
      rateLimit.resetTime = now + 60000 // 1 minute window
    }

    if (rateLimit.count >= RATE_LIMITS.requestsPerMinute) {
      console.warn(`Rate limit exceeded for ${identifier}. Requests: ${rateLimit.count}`)
      return false
    }

    return true
  }

  /**
   * Record a successful API request
   */
  private recordRequest(quotaCost: number, identifier: string = 'global'): void {
    const now = Date.now()
    
    // Update quota usage
    this.quotaUsage.used += quotaCost
    
    // Update rate limit
    const rateLimit = this.rateLimitMap.get(identifier) || { count: 0, resetTime: now + 60000 }
    rateLimit.count++
    this.rateLimitMap.set(identifier, rateLimit)
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
          // Check API limits
          if (!this.canMakeRequest(QUOTA_COSTS.video)) {
            throw new Error('YouTube API quota or rate limit exceeded')
          }

          // Fetch from API
          console.log(`Fetching video ${videoId} from YouTube API`)
          const response = await this.youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: [videoId],
          })

          this.recordRequest(QUOTA_COSTS.video)

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
          // Check API limits
          if (!this.canMakeRequest(QUOTA_COSTS.search)) {
            console.warn('YouTube API quota exceeded, using database fallback')
            return await this.getVideosByQueryFromDB(query, maxResults)
          }

          // Optimize search parameters to reduce quota usage
          const enhancedQuery = this.enhanceSearchQuery(query)
          
          console.log(`Searching YouTube API for: ${enhancedQuery}`)
          const searchResponse = await this.youtube.search.list({
            part: ['snippet'],
            q: enhancedQuery,
            type: ['video'],
            maxResults: Math.min(maxResults * 2, 50), // Get more to filter shorts
            order: 'relevance',
            safeSearch: 'strict',
            videoDuration: 'medium',
          })

          this.recordRequest(QUOTA_COSTS.search)

          if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
            return await this.getVideosByQueryFromDB(query, maxResults)
          }

          // Get video details in batch to reduce API calls
          const videoIds = searchResponse.data.items
            .map((item: any) => item.id?.videoId)
            .filter(Boolean)
            .slice(0, 25) // Limit to 25 to save quota

          let videos: any[] = []
          
          if (videoIds.length > 0 && this.canMakeRequest(QUOTA_COSTS.video)) {
            const videoResponse = await this.youtube.videos.list({
              part: ['contentDetails', 'statistics'],
              id: videoIds,
            })

            this.recordRequest(QUOTA_COSTS.video)

            const combinedVideos = this.combineSearchWithVideoData(searchResponse.data.items, videoResponse.data.items || [])
              .filter(video => this.isValidEducationalVideo(video))
              .slice(0, maxResults)

            // Format videos for frontend consumption
            videos = combinedVideos.map(video => this.formatVideoFromAPI(video))

            // Save videos to database for future use
            for (const video of combinedVideos) {
              await this.saveVideoToDB(video, true).catch(console.error)
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
   * Get trending videos with smart caching
   */
  async getTrendingVideos(): Promise<any[]> {
    try {
      const cacheKey = 'trending:educational'
      
      return await getOrSetCache(
        cacheKey,
        async () => {
          // If quota is low, use database trending
          if (this.quotaUsage.used > RATE_LIMITS.dailyQuotaLimit * 0.8) {
            console.log('Quota usage high, using database trending')
            return await this.getTrendingFromDB()
          }

          const trendingQueries = [
            'programming tutorial 2025',
            'javascript tutorial',
            'python coding',
          ]

          let allVideos: any[] = []

          // Use only one query if quota is getting low
          const maxQueries = this.quotaUsage.used > RATE_LIMITS.dailyQuotaLimit * 0.6 ? 1 : trendingQueries.length

          for (let i = 0; i < maxQueries && this.canMakeRequest(QUOTA_COSTS.search); i++) {
            const query = trendingQueries[i]
            
            try {
              const searchResponse = await this.youtube.search.list({
                part: ['snippet'],
                q: query,
                type: ['video'],
                order: 'relevance',
                maxResults: 8,
                videoDuration: 'medium',
                safeSearch: 'strict',
                publishedAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              })

              this.recordRequest(QUOTA_COSTS.search)

              if (searchResponse.data.items) {
                allVideos.push(...searchResponse.data.items)
              }
            } catch (error) {
              console.error(`Error fetching trending for query: ${query}`, error)
              continue
            }
          }

          // Remove duplicates and get video details
          const uniqueVideoIds = [...new Set(allVideos.map(item => item.id?.videoId))].slice(0, 15)
          
          let trendingVideos: any[] = []
          
          if (uniqueVideoIds.length > 0 && this.canMakeRequest(QUOTA_COSTS.video)) {
            const videoResponse = await this.youtube.videos.list({
              part: ['statistics', 'contentDetails'],
              id: uniqueVideoIds,
            })

            this.recordRequest(QUOTA_COSTS.video)

            const combinedVideos = this.combineSearchWithVideoData(
              allVideos.filter(item => uniqueVideoIds.includes(item.id?.videoId)),
              videoResponse.data.items || []
            )
              .filter(video => this.isValidEducationalVideo(video))
              .sort((a, b) => this.calculateTrendingScore(b) - this.calculateTrendingScore(a))
              .slice(0, 12)

            // Format videos for frontend consumption
            trendingVideos = combinedVideos.map(video => this.formatVideoFromAPI(video))

            // Save to database
            for (const video of combinedVideos) {
              await this.saveVideoToDB(video, true).catch(console.error)
            }
          }

          // If no results, fallback to database
          if (trendingVideos.length === 0) {
            trendingVideos = await this.getTrendingFromDB()
          }

          return trendingVideos
        },
        cacheConfigs.trending
      )
    } catch (error) {
      console.error('Error fetching trending videos:', error)
      return await this.getTrendingFromDB()
    }
  }

  /**
   * Get video comments with rate limiting
   */
  async getVideoComments(videoId: string, maxResults: number = 20): Promise<any[]> {
    try {
      const cacheKey = `comments:${videoId}`
      
      return await getOrSetCache(
        cacheKey,
        async () => {
          // Check API limits
          if (!this.canMakeRequest(QUOTA_COSTS.comments)) {
            throw new Error('YouTube API quota or rate limit exceeded')
          }

          console.log(`Fetching comments for video ${videoId} from YouTube API`)
          const response = await this.youtube.commentThreads.list({
            part: ['snippet'],
            videoId: videoId,
            maxResults: maxResults,
            order: 'relevance',
          })

          this.recordRequest(QUOTA_COSTS.comments)

          const comments = response.data.items?.map((item: any) => ({
            id: item.id,
            text: item.snippet.topLevelComment.snippet.textDisplay,
            author: item.snippet.topLevelComment.snippet.authorDisplayName,
            authorChannelUrl: item.snippet.topLevelComment.snippet.authorChannelUrl,
            authorProfileImageUrl: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
            likeCount: item.snippet.topLevelComment.snippet.likeCount,
            publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
            formattedTime: this.formatDate(item.snippet.topLevelComment.snippet.publishedAt),
          })) || []

          return comments
        },
        cacheConfigs.comments
      )
    } catch (error: any) {
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        throw error
      }
      console.error('Error fetching comments:', error)
      return []
    }
  }

  // Helper methods
  private enhanceSearchQuery(query: string): string {
    const techKeywords = ['programming', 'coding', 'development', 'tutorial', 'course', 'explained', 'guide', 'learn']
    const hasKeyword = techKeywords.some(keyword => query.toLowerCase().includes(keyword))
    return hasKeyword ? query : `${query} programming tutorial`
  }

  private isValidEducationalVideo(video: any): boolean {
    const duration = this.parseISO8601Duration(video.contentDetails?.duration || 'PT0S')
    return duration > 60 && duration < 7200 // Between 1 minute and 2 hours
  }

  private calculateTrendingScore(video: any): number {
    const publishedDate = new Date(video.snippet?.publishedAt)
    const daysSincePublished = Math.max(1, (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24))
    const viewCount = parseInt(video.statistics?.viewCount || '0')
    return viewCount / daysSincePublished
  }

  private parseISO8601Duration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return 0
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')
    
    return hours * 3600 + minutes * 60 + seconds
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      return '1 day ago'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return months === 1 ? '1 month ago' : `${months} months ago`
    } else {
      const years = Math.floor(diffDays / 365)
      return years === 1 ? '1 year ago' : `${years} years ago`
    }
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

  private formatVideoFromAPI(video: any): any {
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

  private async saveVideoToDB(video: any, isSearchResult: boolean = false): Promise<void> {
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

  private async getTrendingFromDB(): Promise<any[]> {
    try {
      const videos = await prisma.video.findMany({
        where: {
          duration: { gt: 60 }, // Exclude shorts
          publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
        },
        include: { educator: true },
        orderBy: { viewCount: 'desc' },
        take: 12,
      })

      return videos.map(video => this.formatVideoFromDB(video))
    } catch (error) {
      console.error('Error getting trending videos from database:', error)
      return []
    }
  }

  /**
   * Get current quota usage information
   */
  getQuotaInfo(): { used: number; limit: number; remaining: number; resetTime: number } {
    return {
      used: this.quotaUsage.used,
      limit: RATE_LIMITS.dailyQuotaLimit,
      remaining: RATE_LIMITS.dailyQuotaLimit - this.quotaUsage.used,
      resetTime: this.quotaUsage.resetTime,
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

// Export singleton instance
export const youtubeApiService = new YouTubeAPIService()
