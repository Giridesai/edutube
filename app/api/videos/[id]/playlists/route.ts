import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/database'
import authOptions from '@/lib/auth'

// GET: Get user's playlists and check which ones contain this video
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

    // Get user's playlists with video inclusion status
    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        videos: {
          where: { videoId },
          select: { id: true },
        },
        _count: {
          select: { videos: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const playlistsWithStatus = playlists.map(playlist => ({
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      isPublic: playlist.isPublic,
      videoCount: playlist._count.videos,
      containsVideo: playlist.videos.length > 0,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    }))

    return NextResponse.json({
      playlists: playlistsWithStatus,
    })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    )
  }
}

// POST: Add video to playlist(s)
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
    const { playlistIds, action = 'add' } = body // playlistIds: string[] or string, action: 'add' | 'remove'

    if (!playlistIds) {
      return NextResponse.json({ error: 'Playlist ID(s) required' }, { status: 400 })
    }

    // Normalize to array
    const playlistIdArray = Array.isArray(playlistIds) ? playlistIds : [playlistIds]

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Verify all playlists belong to the user
    const userPlaylists = await prisma.playlist.findMany({
      where: {
        id: { in: playlistIdArray },
        userId,
      },
    })

    if (userPlaylists.length !== playlistIdArray.length) {
      return NextResponse.json({ error: 'One or more playlists not found or unauthorized' }, { status: 403 })
    }

    const results = []

    for (const playlistId of playlistIdArray) {
      try {
        if (action === 'add') {
          // Get the current max order for this playlist
          const maxOrder = await prisma.playlistVideo.findFirst({
            where: { playlistId },
            orderBy: { order: 'desc' },
            select: { order: true },
          })

          const nextOrder = (maxOrder?.order || 0) + 1

          // Add video to playlist (upsert to handle duplicates)
          const playlistVideo = await prisma.playlistVideo.upsert({
            where: {
              playlistId_videoId: {
                playlistId,
                videoId,
              },
            },
            update: {
              // If it already exists, just update the order to move it to the end
              order: nextOrder,
              addedAt: new Date(),
            },
            create: {
              playlistId,
              videoId,
              order: nextOrder,
            },
          })

          results.push({
            playlistId,
            action: 'added',
            playlistVideo,
          })
        } else if (action === 'remove') {
          // Remove video from playlist
          const deleted = await prisma.playlistVideo.deleteMany({
            where: {
              playlistId,
              videoId,
            },
          })

          results.push({
            playlistId,
            action: 'removed',
            deletedCount: deleted.count,
          })
        }

        // Update playlist's updatedAt timestamp
        await prisma.playlist.update({
          where: { id: playlistId },
          data: { updatedAt: new Date() },
        })
      } catch (error) {
        console.error(`Error ${action}ing video ${videoId} to/from playlist ${playlistId}:`, error)
        results.push({
          playlistId,
          action: 'error',
          error: `Failed to ${action} video`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Error managing playlist videos:', error)
    return NextResponse.json(
      { error: 'Failed to manage playlist videos' },
      { status: 500 }
    )
  }
}
