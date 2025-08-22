import { NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

// Fallback trending videos for when YouTube API is unavailable
function getFallbackTrendingVideos() {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: 'JavaScript Fundamentals - Complete Tutorial',
      channelTitle: 'CodeAcademy',
      channelId: 'UC123',
      thumbnailUrl: 'https://via.placeholder.com/320x180/2563eb/ffffff?text=JS+Tutorial',
      duration: '45:30',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Learn JavaScript fundamentals with hands-on examples and exercises.',
      viewCount: 125000,
      likeCount: 5200,
      views: '125K views',
      likes: '5200',
      published: '2 days ago',
      tags: ['javascript', 'programming', 'tutorial'],
    },
    {
      id: 'example2',
      title: 'React Hooks Explained - Beginner to Advanced',
      channelTitle: 'WebDev Pro',
      channelId: 'UC456',
      thumbnailUrl: 'https://via.placeholder.com/320x180/06b6d4/ffffff?text=React+Hooks',
      duration: '32:15',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Master React Hooks with practical examples and best practices.',
      viewCount: 89000,
      likeCount: 3800,
      views: '89K views',
      likes: '3800',
      published: '1 day ago',
      tags: ['react', 'hooks', 'javascript'],
    },
    {
      id: 'example3',
      title: 'Python for Beginners - Full Course',
      channelTitle: 'PythonMaster',
      channelId: 'UC789',
      thumbnailUrl: 'https://via.placeholder.com/320x180/10b981/ffffff?text=Python+Course',
      duration: '2:15:45',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Complete Python programming course for absolute beginners.',
      viewCount: 245000,
      likeCount: 9200,
      views: '245K views',
      likes: '9200',
      published: '3 days ago',
      tags: ['python', 'programming', 'beginners'],
    },
    {
      id: 'example4',
      title: 'CSS Grid Layout - Modern Web Design',
      channelTitle: 'DesignCode',
      channelId: 'UC101',
      thumbnailUrl: 'https://via.placeholder.com/320x180/8b5cf6/ffffff?text=CSS+Grid',
      duration: '28:22',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Learn CSS Grid for creating responsive layouts efficiently.',
      viewCount: 67000,
      likeCount: 2900,
      views: '67K views',
      likes: '2900',
      published: '1 day ago',
      tags: ['css', 'grid', 'web-design'],
    }
  ]
}

export async function GET() {
  try {
    if (!process.env.YOUTUBE_API_KEY) {
      console.log('YouTube API key not configured, returning fallback data')
      return NextResponse.json({ 
        videos: getFallbackTrendingVideos(),
        message: 'Showing sample programming videos (API key not configured)'
      })
    }

    // Use the new YouTube API service with intelligent caching and rate limiting
    const videos = await youtubeApiService.getTrendingVideos()

    return NextResponse.json({ 
      videos,
      quota: youtubeApiService.getQuotaInfo(),
      message: videos.length > 0 ? 'Showing trending educational videos' : undefined
    })

  } catch (error: any) {
    console.error('YouTube trending error:', error?.message || 'Unknown error')
    
    // Check if it's a quota/rate limit error
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'YouTube API quota or rate limit exceeded. Please try again later.',
          videos: getFallbackTrendingVideos(),
          message: 'Showing sample programming videos (YouTube API temporarily unavailable)'
        },
        { status: 503 }
      )
    }
    
    // Always return fallback data instead of error
    return NextResponse.json({ 
      videos: getFallbackTrendingVideos(),
      message: 'Showing sample programming videos (service temporarily unavailable)'
    })
  }
}
