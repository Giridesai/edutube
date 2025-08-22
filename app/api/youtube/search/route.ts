import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    
    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
    }

    // Use the new YouTube API service with intelligent caching and rate limiting
    const videos = await youtubeApiService.searchVideos(query, 20)

    return NextResponse.json({ 
      videos,
      quota: youtubeApiService.getQuotaInfo()
    })
  } catch (error: any) {
    console.error('YouTube search error:', error?.message || 'Unknown error')
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'programming'
    
    // Check if it's a quota/rate limit error
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'YouTube API quota or rate limit exceeded. Please try again later.',
          videos: getSampleSearchResults(query),
          message: 'Using sample data (YouTube API temporarily unavailable)'
        },
        { status: 503 }
      )
    }
    
    // Fallback to sample data for any other errors
    return NextResponse.json({ 
      videos: getSampleSearchResults(query),
      message: 'Using sample data (YouTube API temporarily unavailable)'
    })
  }
}

// Sample search results for when API is unavailable
function getSampleSearchResults(query: string) {
  const allSamples = [
    {
      id: 'sample-js-search-1',
      title: `${query} - Complete Tutorial for Beginners`,
      channelTitle: 'TechEdu Pro',
      channelId: 'sample-channel-1',
      thumbnailUrl: 'https://via.placeholder.com/320x180/1a1a1a/ffffff?text=Tutorial',
      duration: '45:30',
      publishedAt: '2024-01-15T10:00:00Z',
      description: `Learn ${query} with this comprehensive tutorial covering all the basics and advanced concepts.`,
      viewCount: 25000,
      likeCount: 1500,
    },
    {
      id: 'sample-js-search-2',
      title: `Advanced ${query} Techniques and Best Practices`,
      channelTitle: 'CodeMaster',
      channelId: 'sample-channel-2',
      thumbnailUrl: 'https://via.placeholder.com/320x180/61dafb/000000?text=Advanced',
      duration: '1:20:15',
      publishedAt: '2024-01-10T14:30:00Z',
      description: `Take your ${query} skills to the next level with advanced techniques and industry best practices.`,
      viewCount: 18000,
      likeCount: 1200,
    },
    {
      id: 'sample-js-search-3',
      title: `${query} Project - Build Real Applications`,
      channelTitle: 'Project Builder',
      channelId: 'sample-channel-3',
      thumbnailUrl: 'https://via.placeholder.com/320x180/3776ab/ffffff?text=Project',
      duration: '2:15:45',
      publishedAt: '2024-01-08T09:00:00Z',
      description: `Build real-world projects using ${query} and gain practical experience.`,
      viewCount: 32000,
      likeCount: 2100,
    }
  ]
  
  return allSamples
}
