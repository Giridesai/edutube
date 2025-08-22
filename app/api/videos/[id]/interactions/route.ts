import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/database'
import authOptions from '@/lib/auth'

// GET: Get user's interactions with a specific video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: videoId } = await params
    const userId = (session.user as any).id

    // Get all interactions for this user and video
    const interactions = await prisma.videoInteraction.findMany({
      where: {
        userId,
        videoId,
      },
    })

    // Format interactions into a convenient object
    const userInteractions = {
      liked: interactions.some(i => i.type === 'like'),
      saved: interactions.some(i => i.type === 'save'),
      bookmarked: interactions.some(i => i.type === 'bookmark'),
    }

    // Get interaction counts for the video
    const interactionCounts = await prisma.videoInteraction.groupBy({
      by: ['type'],
      where: { videoId },
      _count: { type: true },
    })

    const counts = {
      likes: interactionCounts.find(c => c.type === 'like')?._count.type || 0,
      saves: interactionCounts.find(c => c.type === 'save')?._count.type || 0,
      bookmarks: interactionCounts.find(c => c.type === 'bookmark')?._count.type || 0,
    }

    return NextResponse.json({
      userInteractions,
      counts,
    })
  } catch (error) {
    console.error('Error fetching video interactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch video interactions' },
      { status: 500 }
    )
  }
}

// POST: Create or toggle a video interaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: videoId } = await params
    const userId = (session.user as any).id
    const body = await request.json()
    const { type, action } = body // type: 'like' | 'save' | 'bookmark', action: 'add' | 'remove' | 'toggle'

    if (!type || !['like', 'save', 'bookmark'].includes(type)) {
      return NextResponse.json({ error: 'Valid interaction type is required' }, { status: 400 })
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const existingInteraction = await prisma.videoInteraction.findUnique({
      where: {
        userId_videoId_type: {
          userId,
          videoId,
          type,
        },
      },
    })

    let result
    let actionTaken = ''

    if (action === 'toggle' || !action) {
      if (existingInteraction) {
        // Remove interaction
        await prisma.videoInteraction.delete({
          where: { id: existingInteraction.id },
        })
        actionTaken = 'removed'
      } else {
        // Add interaction
        result = await prisma.videoInteraction.create({
          data: {
            userId,
            videoId,
            type,
          },
        })
        actionTaken = 'added'
      }
    } else if (action === 'add') {
      if (!existingInteraction) {
        result = await prisma.videoInteraction.create({
          data: {
            userId,
            videoId,
            type,
          },
        })
        actionTaken = 'added'
      } else {
        actionTaken = 'already_exists'
      }
    } else if (action === 'remove') {
      if (existingInteraction) {
        await prisma.videoInteraction.delete({
          where: { id: existingInteraction.id },
        })
        actionTaken = 'removed'
      } else {
        actionTaken = 'not_found'
      }
    }

    // Get updated interaction counts
    const interactionCounts = await prisma.videoInteraction.groupBy({
      by: ['type'],
      where: { videoId },
      _count: { type: true },
    })

    const counts = {
      likes: interactionCounts.find(c => c.type === 'like')?._count.type || 0,
      saves: interactionCounts.find(c => c.type === 'save')?._count.type || 0,
      bookmarks: interactionCounts.find(c => c.type === 'bookmark')?._count.type || 0,
    }

    return NextResponse.json({
      success: true,
      action: actionTaken,
      type,
      counts,
      interaction: result || null,
    })
  } catch (error) {
    console.error('Error managing video interaction:', error)
    return NextResponse.json(
      { error: 'Failed to manage video interaction' },
      { status: 500 }
    )
  }
}
