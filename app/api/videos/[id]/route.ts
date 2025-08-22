import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/database'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

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

    // First check if video exists in our database
    let video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        educator: true,
        chapters: {
          orderBy: { startTime: 'asc' },
        },
      },
    })

    // If not in database, fetch from YouTube API
    if (!video && process.env.YOUTUBE_API_KEY) {
      const response = await youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [videoId],
      })

      if (response.data.items && response.data.items.length > 0) {
        const ytVideo = response.data.items[0]
        const snippet = ytVideo.snippet
        const contentDetails = ytVideo.contentDetails
        const statistics = ytVideo.statistics

        // Convert ISO 8601 duration to seconds
        const duration = contentDetails?.duration
        let durationSeconds = 0
        if (duration) {
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
          if (match) {
            const hours = parseInt(match[1] || '0')
            const minutes = parseInt(match[2] || '0')
            const seconds = parseInt(match[3] || '0')
            durationSeconds = hours * 3600 + minutes * 60 + seconds
          }
        }

        // Reject YouTube Shorts (videos 60 seconds or less)
        if (durationSeconds <= 60) {
          return NextResponse.json({ error: 'YouTube Shorts are not supported' }, { status: 404 })
        }

        // Save to database
        video = await prisma.video.create({
          data: {
            id: videoId,
            title: snippet?.title || '',
            description: snippet?.description || '',
            thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
            duration: durationSeconds,
            publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
            channelTitle: snippet?.channelTitle || '',
            categoryId: snippet?.categoryId || null,
            viewCount: parseInt(statistics?.viewCount || '0'),
            likeCount: parseInt(statistics?.likeCount || '0'),
            tags: JSON.stringify(snippet?.tags || []),
            keyPoints: JSON.stringify([]),
          },
          include: {
            educator: true,
            chapters: {
              orderBy: { startTime: 'asc' },
            },
          },
        })
        
        // Store channelId temporarily for response
        ;(video as any).channelId = snippet?.channelId
      }
    }

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // For videos from database that don't have channelId, try to get it from educator
    let channelId = (video as any).channelId || video.educator?.channelId
    
    // If still no channelId and we have YouTube API access, try to fetch it
    if (!channelId && process.env.YOUTUBE_API_KEY) {
      try {
        const response = await youtube.videos.list({
          part: ['snippet'],
          id: [videoId],
        })
        if (response.data.items && response.data.items.length > 0) {
          channelId = response.data.items[0].snippet?.channelId
        }
      } catch (error) {
        console.log('Could not fetch additional video data:', error)
      }
    }

    // Format response
    const formattedVideo = {
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      publishedAt: video.publishedAt,
      channelTitle: video.channelTitle,
      channelId: channelId,
      viewCount: video.viewCount,
      likeCount: video.likeCount,
      summary: video.summary,
      keyPoints: JSON.parse(video.keyPoints || '[]'),
      difficulty: video.difficulty,
      subject: video.subject,
      educator: video.educator,
      chapters: video.chapters,
      tags: JSON.parse(video.tags || '[]'),
    }

    return NextResponse.json({ video: formattedVideo })
  } catch (error) {
    console.error('Video details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video details' },
      { status: 500 }
    )
  }
}
