import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const videoId = params.id

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      )
    }

    // Use the new YouTube API service with intelligent caching and database-first approach
    const video = await youtubeApiService.getVideo(videoId)

    return NextResponse.json({ 
      video,
      quota: youtubeApiService.getQuotaInfo()
    })

  } catch (error: any) {
    console.error('Error fetching video:', error)
    
    // Check if it's a quota/rate limit error
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return NextResponse.json(
        { error: 'YouTube API quota or rate limit exceeded. Please try again later.' },
        { status: 503 }
      )
    }
    
    if (error.message.includes('Video not found')) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch video details' },
      { status: 500 }
    )
  }
}
