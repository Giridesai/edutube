import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/database'

function formatDuration(totalSeconds?: number | null): string | undefined {
  if (!totalSeconds && totalSeconds !== 0) return undefined
  const s = Math.max(0, totalSeconds!)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = Math.floor(s % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

function formatViews(count?: number | null): string | undefined {
  if (count == null) return undefined
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return count.toString()
}

function formatPublished(date?: Date | null): string | undefined {
  if (!date) return undefined
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id as string
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // 1) History: recent watch history joined with videos
    const historyRows = await prisma.watchHistory.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { watchedAt: 'desc' },
      take: limit,
    })

    const history = historyRows.map(h => ({
      id: h.videoId,
      title: h.video?.title || 'Untitled',
      thumbnailUrl: h.video?.thumbnailUrl || undefined,
      duration: formatDuration(h.video?.duration ?? undefined),
      channel: h.video?.channelTitle || undefined,
      views: formatViews(h.video?.viewCount ?? undefined),
      published: formatPublished(h.video?.publishedAt ?? undefined),
    }))

    // 2) Watch Later: videos the user saved (VideoInteraction type 'save')
    const savedRows = await prisma.videoInteraction.findMany({
      where: { userId, type: 'save' },
      include: { video: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const watchLater = savedRows
      .filter(s => !!s.video)
      .map(s => ({
        id: s.videoId,
        title: s.video!.title,
        thumbnailUrl: s.video!.thumbnailUrl || undefined,
        duration: formatDuration(s.video!.duration ?? undefined),
        channel: s.video!.channelTitle || undefined,
        views: formatViews(s.video!.viewCount ?? undefined),
        published: formatPublished(s.video!.publishedAt ?? undefined),
      }))

    // 3) Playlists: user's playlists with counts and a cover image from first video
    const playlistsRaw = await prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: { select: { videos: true } },
        videos: {
          take: 1,
          orderBy: { order: 'asc' },
          include: { video: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    const playlists = playlistsRaw.map(p => ({
      id: p.id,
      title: p.title,
      coverUrl: p.videos[0]?.video?.thumbnailUrl || undefined,
      count: p._count.videos,
      owner: 'You',
    }))

    return NextResponse.json({ history, watchLater, playlists })
  } catch (error) {
    console.error('Error fetching user library:', error)
    return NextResponse.json({ error: 'Failed to fetch library' }, { status: 500 })
  }
}
