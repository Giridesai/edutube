import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/database'

// Lazy YouTube client (only if needed to hydrate missing description)
function getYouTubeClient() {
  return google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const videoId = params.id
    const searchParams = request.nextUrl.searchParams
    const forceRefresh = searchParams.get('forceRefresh') === '1'

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Fetch from DB first
    let video = await prisma.video.findUnique({ where: { id: videoId } })

    // If no video or missing description and we have API key (or force refresh), fetch from YouTube
    if ((forceRefresh || !video || !video.description) && process.env.YOUTUBE_API_KEY) {
      try {
        const yt = getYouTubeClient()
        const res = await yt.videos.list({ part: ['snippet'], id: [videoId] })
        const item = res.data.items?.[0]
        if (item?.snippet) {
          const fullDesc = item.snippet.description || ''
          // Upsert minimal fields to persist description
            await prisma.video.upsert({
              where: { id: videoId },
              update: { description: fullDesc, title: item.snippet.title || undefined, channelTitle: item.snippet.channelTitle || undefined },
              create: {
                id: videoId,
                title: item.snippet.title || '',
                description: fullDesc,
                thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
                duration: 0, // unknown here; main video endpoint will update
                publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null,
                channelTitle: item.snippet.channelTitle || '',
                tags: JSON.stringify(item.snippet.tags || []),
                keyPoints: JSON.stringify([]),
              },
            })
          // Re-read to include any existing fields
          video = await prisma.video.findUnique({ where: { id: videoId } })
        }
      } catch (e) {
        console.warn('Failed to refresh description from YouTube:', e)
      }
    }

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const fullDescription = video.description || ''
    const MAX_LEN = 300
    const isTruncated = fullDescription.length > MAX_LEN

    // Ensure we cut on boundary (avoid breaking surrogate pairs)
    let shortDescription = fullDescription
    if (isTruncated) {
      shortDescription = fullDescription.slice(0, MAX_LEN)
      // Avoid cutting in the middle of a word for nicer preview
      const lastSpace = shortDescription.lastIndexOf(' ')
      if (lastSpace > MAX_LEN * 0.6) {
        shortDescription = shortDescription.slice(0, lastSpace)
      }
    }

    return NextResponse.json({
      id: videoId,
      shortDescription,
      fullDescription,
      isTruncated,
      length: fullDescription.length,
      updatedAt: video.updatedAt,
    })
  } catch (error) {
    console.error('Description endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch description' }, { status: 500 })
  }
}
