import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/database'
import authOptions from '@/lib/auth'

// GET: Get user's playlists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(request.url)
    const includeVideos = searchParams.get('includeVideos') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        videos: includeVideos ? {
          include: { video: true },
          orderBy: { order: 'asc' },
        } : false,
        _count: {
          select: { videos: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Error fetching user playlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}

// POST: Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const { title, description, isPublic = false } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Playlist title is required' }, { status: 400 })
    }

    const playlist = await prisma.playlist.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        isPublic,
        userId,
      },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    })

    return NextResponse.json({ playlist }, { status: 201 })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    )
  }
}
