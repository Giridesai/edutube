import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/database'
import authOptions from '@/lib/auth'

// POST: Setup default playlists for user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Check if user already has playlists
    const existingPlaylists = await prisma.playlist.findMany({
      where: { userId },
    })

    if (existingPlaylists.length > 0) {
      return NextResponse.json({ 
        message: 'User already has playlists',
        playlists: existingPlaylists,
      })
    }

    // Create default playlists
    const defaultPlaylists = [
      {
        title: '📚 Watch Later',
        description: 'Videos to watch later',
        isPublic: false,
      },
      {
        title: '⭐ Favorites',
        description: 'My favorite educational videos',
        isPublic: false,
      },
      {
        title: '🎓 Study Materials',
        description: 'Important videos for studying',
        isPublic: false,
      },
    ]

    const createdPlaylists = await Promise.all(
      defaultPlaylists.map(playlist =>
        prisma.playlist.create({
          data: {
            ...playlist,
            userId,
          },
          include: {
            _count: {
              select: { videos: true },
            },
          },
        })
      )
    )

    return NextResponse.json({
      message: 'Default playlists created successfully',
      playlists: createdPlaylists,
    }, { status: 201 })
  } catch (error) {
    console.error('Error setting up default playlists:', error)
    return NextResponse.json(
      { error: 'Failed to setup default playlists' },
      { status: 500 }
    )
  }
}
