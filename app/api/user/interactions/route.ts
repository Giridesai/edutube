import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/database'
import authOptions from '@/lib/auth'

// GET: Get user's saved/liked/bookmarked videos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // 'like' | 'save' | 'bookmark' | 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause: any = { userId }
    
    if (type && type !== 'all') {
      whereClause.type = type
    }

    const interactions = await prisma.videoInteraction.findMany({
      where: whereClause,
      include: {
        video: {
          include: {
            educator: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    // Group by video and collect interaction types
    const videoMap = new Map()
    
    interactions.forEach(interaction => {
      const videoId = interaction.videoId
      if (!videoMap.has(videoId)) {
        videoMap.set(videoId, {
          video: interaction.video,
          interactions: [],
        })
      }
      videoMap.get(videoId).interactions.push({
        type: interaction.type,
        createdAt: interaction.createdAt,
      })
    })

    const groupedResults = Array.from(videoMap.values()).map(item => ({
      ...item.video,
      userInteractions: item.interactions,
    }))

    return NextResponse.json({
      videos: groupedResults,
      total: groupedResults.length,
      hasMore: groupedResults.length === limit,
    })
  } catch (error) {
    console.error('Error fetching user interactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user interactions' },
      { status: 500 }
    )
  }
}
