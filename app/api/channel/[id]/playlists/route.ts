import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const channelId = params.id

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const playlists = await youtubeApiService.getChannelPlaylists(channelId, limit)

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Error fetching channel playlists:', error)
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
  }
}
