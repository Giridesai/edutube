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
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ 
        comments: [],
        message: 'YouTube API key not configured'
      })
    }

    // Use the new YouTube API service with intelligent caching and rate limiting
    const comments = await youtubeApiService.getVideoComments(videoId, 20)

    // Format comments to match the expected structure
    const formattedComments = comments.map((comment: any) => ({
      id: comment.id || '',
      author: comment.author || 'Anonymous',
      authorAvatar: comment.authorProfileImageUrl || '',
      text: comment.text || '',
      likes: comment.likeCount || 0,
      published: comment.formattedTime || '',
      replies: [] // For simplicity, not fetching replies in this demo
    }))

    return NextResponse.json({ 
      comments: formattedComments,
      quota: youtubeApiService.getQuotaInfo()
    })

  } catch (error: any) {
    console.error('Error fetching comments:', error)
    
    // Check for specific error types
    if (error.message.includes('disabled') || error.message.includes('forbidden')) {
      return NextResponse.json({ 
        comments: [],
        message: 'Comments are disabled for this video'
      })
    }
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return NextResponse.json({ 
        comments: [],
        message: 'YouTube API quota or rate limit exceeded. Please try again later.'
      }, { status: 503 })
    }
    
    if (error.message.includes('not found')) {
      return NextResponse.json({ 
        comments: [],
        message: 'No comments found for this video'
      })
    }
    
    return NextResponse.json(
      { 
        comments: [],
        error: 'Failed to fetch comments' 
      },
      { status: 500 }
    )
  }
}
