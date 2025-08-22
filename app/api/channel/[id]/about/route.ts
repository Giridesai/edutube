import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const channelId = params.id

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const info = await youtubeApiService.getChannelInfo(channelId)

    return NextResponse.json({
      about: {
        description: info.description,
        subscribers: info.subscribers,
        videoCount: info.videoCount,
        viewCount: info.viewCount,
        publishedAt: info.publishedAt,
        bannerUrl: info.bannerUrl,
        avatarUrl: info.avatarUrl,
        handle: info.handle,
        name: info.name,
      }
    })
  } catch (error) {
    console.error('Error fetching channel about:', error)
    return NextResponse.json({ error: 'Failed to fetch channel info' }, { status: 500 })
  }
}
