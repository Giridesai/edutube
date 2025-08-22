import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'
import { youtubeApiService } from '@/lib/youtube-api-service'

// POST: Subscribe to a channel (by channelId); creates Educator record if needed
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: channelId } = await context.params
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const userId = (session.user as any).id

    // Try to get channel info from YouTube to properly name the educator
    let channelInfo: any | null = null
    try {
      channelInfo = await youtubeApiService.getChannelInfo(channelId)
    } catch (e) {
      // ignore API failures; we'll fallback to placeholder and enrich later
      channelInfo = null
    }

    // Ensure an Educator exists with this channelId, enriched with channel info if available
    let educator = await prisma.educator.findFirst({ where: { channelId } })
    if (!educator) {
      try {
        educator = await prisma.educator.create({
          data: {
            name: channelInfo?.name || 'Channel',
            handle: channelInfo?.handle || null,
            avatarUrl: channelInfo?.avatarUrl || null,
            channelId,
            description: channelInfo?.description || null,
            verified: false,
          },
        })
      } catch (err) {
        // Fallback minimal create if unique constraints on handle fail, etc.
        educator = await prisma.educator.create({
          data: {
            name: channelInfo?.name || 'Channel',
            channelId,
          },
        })
      }
    } else {
      // If we already have an educator but it looks like a placeholder, try to enrich it
      const needsEnrich = !educator.name || educator.name === 'Channel' || !educator.avatarUrl || !educator.handle || !educator.description
      if (needsEnrich && channelInfo) {
        try {
          await prisma.educator.update({
            where: { id: educator.id },
            data: {
              name: channelInfo.name || educator.name,
              handle: channelInfo.handle ?? educator.handle,
              avatarUrl: channelInfo.avatarUrl ?? educator.avatarUrl,
              description: channelInfo.description ?? educator.description,
            },
          })
          // refresh educator reference
          educator = await prisma.educator.findUnique({ where: { id: educator.id } })
        } catch (e) {
          // ignore enrichment errors
        }
      }
    }

    if (!educator) {
      return NextResponse.json({ error: 'Failed to ensure channel' }, { status: 500 })
    }

    const subscription = await (prisma as any).subscription.upsert({
      where: {
        userId_educatorId: {
          userId,
          educatorId: educator.id,
        },
      },
      update: {},
      create: {
        userId,
        educatorId: educator.id,
      },
    })

    return NextResponse.json({ success: true, subscription })
  } catch (error) {
    console.error('Error subscribing to channel:', error)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

// DELETE: Unsubscribe from a channel
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: channelId } = await context.params
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const userId = (session.user as any).id

    const educator = await prisma.educator.findFirst({ where: { channelId } })
    if (!educator) {
      return NextResponse.json({ success: true })
    }

    await (prisma as any).subscription.deleteMany({
      where: {
        userId,
        educatorId: educator.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unsubscribing from channel:', error)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}

// GET: Check subscription status
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ subscribed: false })
    }

    const { id: channelId } = await context.params
    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 })
    }

    const userId = (session.user as any).id
    const educator = await prisma.educator.findFirst({ where: { channelId } })

    if (!educator) return NextResponse.json({ subscribed: false })

    const sub = await (prisma as any).subscription.findUnique({
      where: {
        userId_educatorId: { userId, educatorId: educator.id },
      },
    })

    return NextResponse.json({ subscribed: !!sub })
  } catch (error) {
    console.error('Error checking subscription:', error)
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 })
  }
}
