import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/database'
import { youtubeApiService } from '@/lib/youtube-api-service'

// GET: list current user's subscriptions (channels)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [subs, total] = await Promise.all([
      (prisma as any).subscription.findMany({
        where: { userId },
        include: { educator: true },
        orderBy: { subscribedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      (prisma as any).subscription.count({ where: { userId } }),
    ])

    // Attempt to enrich placeholder educators on the fly (e.g., name === 'Channel')
    for (const s of subs) {
      const e = s.educator
      if (!e) continue
      const looksPlaceholder = !e.name || e.name === 'Channel'
      const needsAvatar = !e.avatarUrl
      const needsHandle = !e.handle
      const needsDesc = !e.description
      if (e.channelId && (looksPlaceholder || needsAvatar || needsHandle || needsDesc)) {
        try {
          const info = await youtubeApiService.getChannelInfo(e.channelId)
          if (info) {
            // Update DB in background (non-blocking for response correctness)
            prisma.educator.update({
              where: { id: e.id },
              data: {
                name: info.name || e.name,
                handle: info.handle ?? e.handle,
                avatarUrl: info.avatarUrl ?? e.avatarUrl,
                description: info.description ?? e.description,
              },
            }).catch(() => {})

            // Also mutate the in-memory object for immediate response
            s.educator.name = info.name || s.educator.name
            s.educator.handle = info.handle ?? s.educator.handle
            s.educator.avatarUrl = info.avatarUrl ?? s.educator.avatarUrl
            s.educator.description = info.description ?? s.educator.description
          }
        } catch {
          // ignore enrichment failures (quota/ratelimit)
        }
      }
    }

    const channels = subs.map((s: any) => ({
      id: s.educator.id,
      name: s.educator.name,
      handle: s.educator.handle || undefined,
      avatarUrl: s.educator.avatarUrl || undefined,
      channelId: s.educator.channelId || undefined,
      description: s.educator.description || undefined,
      subscribedAt: s.subscribedAt,
    }))

    return NextResponse.json({
      channels,
      total,
      hasMore: offset + channels.length < total,
    })
  } catch (e) {
    console.error('Error fetching subscriptions:', e)
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
  }
}
