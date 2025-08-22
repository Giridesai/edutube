import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/database'
import { chatgptOSSService } from '../services/chatgpt-oss-service'
import { getYouTubeApiKey } from '@/lib/utils/api-keys'

const youtube = google.youtube({
  version: 'v3',
  auth: getYouTubeApiKey(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Check if summary already exists in database
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (existingVideo?.summary) {
      return NextResponse.json({
        summary: existingVideo.summary,
        keyPoints: JSON.parse(existingVideo.keyPoints || '[]'),
        difficulty: existingVideo.difficulty,
        subject: existingVideo.subject,
        source: 'cached'
      })
    }

    // Get video details from YouTube
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    })

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const video = videoResponse.data.items[0]
    const snippet = video.snippet
    const title = snippet?.title || ''
    const description = snippet?.description || ''

    // Test ChatGPT OSS connection before proceeding
    const isConnected = await chatgptOSSService.testConnection()
    
    // Generate AI summary using ChatGPT OSS 120B
    const analysis = await chatgptOSSService.generateVideoSummary(title, description)

    // Update database with AI analysis
    try {
      await prisma.video.upsert({
        where: { id: videoId },
        update: {
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          difficulty: analysis.difficulty,
          subject: analysis.subject,
        },
        create: {
          id: videoId,
          title: title,
          description: description,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          difficulty: analysis.difficulty,
          subject: analysis.subject,
          tags: JSON.stringify([]),
        },
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Continue with the response even if DB save fails
    }

    return NextResponse.json({
      ...analysis,
      source: isConnected ? 'chatgpt-oss-120b' : 'fallback',
      model: 'ChatGPT OSS 120B'
    })
  } catch (error) {
    console.error('ChatGPT OSS video summary error:', error)
    
    // Return fallback response
    return NextResponse.json({
      summary: "This educational video contains valuable learning content. AI analysis is temporarily unavailable.",
      keyPoints: [
        "Educational video content",
        "Learning objectives covered", 
        "Key concepts explained",
        "Practical knowledge shared"
      ],
      difficulty: "intermediate",
      subject: "general",
      source: 'fallback',
      error: 'AI service temporarily unavailable'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description } = body
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Generate AI summary for custom content
    const analysis = await chatgptOSSService.generateVideoSummary(title, description || '')
    
    return NextResponse.json({
      ...analysis,
      source: 'chatgpt-oss-120b',
      model: 'ChatGPT OSS 120B'
    })
  } catch (error) {
    console.error('ChatGPT OSS custom summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
