import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/database'
import { AIServiceManager } from '../services/ai-service-manager'
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

    // Get fresh AI service manager instance
    const aiServiceManager = AIServiceManager.getInstance()

    // Test AI service connection
    const isConnected = await aiServiceManager.testConnection()
    if (!isConnected) {
      console.warn('AI service not available, will use enhanced fallback response')
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

    // Generate AI summary using current AI service
    const analysis = await aiServiceManager.generateVideoSummary(title, description)

    // Update database with AI analysis
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

    return NextResponse.json({
      ...analysis,
      source: isConnected ? 'ai-generated' : 'enhanced-fallback',
      serviceName: aiServiceManager.getServiceName()
    })
  } catch (error) {
    console.error('AI summary error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate video summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
