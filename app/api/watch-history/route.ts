import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

function formatDuration(totalSeconds?: number | null): string | undefined {
  if (!totalSeconds && totalSeconds !== 0) return undefined
  const s = Math.max(0, totalSeconds!)
  const hours = Math.floor(s / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = Math.floor(s % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
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
    return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => ({}))
    const { videoId, watchTime = 0, completed = false } = body || {}

    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    const watchHistory = await prisma.watchHistory.upsert({
      where: { userId_videoId: { userId, videoId } },
      update: { watchTime: Number(watchTime) || 0, completed: Boolean(completed), watchedAt: new Date() },
      create: { userId, videoId, watchTime: Number(watchTime) || 0, completed: Boolean(completed) },
    })

    return NextResponse.json({ watchHistory }, { status: 201 })
  } catch (error) {
    console.error('Watch history error:', error)
    return NextResponse.json({ error: 'Failed to update watch history' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const rows = await prisma.watchHistory.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { watchedAt: 'desc' },
      include: { video: true },
    })

    const videos = rows
      .filter(r => !!r.video)
      .map(r => {
        const durationSeconds = r.video?.duration ?? undefined
        const progress = durationSeconds && durationSeconds > 0 ? Math.min(100, Math.round((r.watchTime / durationSeconds) * 100)) : undefined
        return {
          id: r.videoId,
          title: r.video?.title || 'Untitled',
          channelTitle: r.video?.channelTitle || undefined,
          channelId: undefined as string | undefined, // not stored in DB
          thumbnailUrl: r.video?.thumbnailUrl || undefined,
          duration: formatDuration(durationSeconds),
          watchedAt: r.watchedAt.toISOString(),
          watchProgress: progress,
          views: formatViews(r.video?.viewCount ?? undefined),
          published: formatPublished(r.video?.publishedAt ?? undefined),
        }
      })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Watch history fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch watch history' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    if (videoId) {
      await prisma.watchHistory.delete({
        where: { userId_videoId: { userId, videoId } },
      }).catch(() => undefined)
      return NextResponse.json({ success: true })
    }

    await prisma.watchHistory.deleteMany({ where: { userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Watch history delete error:', error)
    return NextResponse.json({ error: 'Failed to delete watch history' }, { status: 500 })
  }
}
