import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'
import { prisma } from '@/lib/database'
import { getServerSession } from 'next-auth/next'
import authOptions from '@/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const channelId = params.id

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // First check if we have channel data in our database
    let channelProfile = null
    let channelVideos: any[] = []

    const { searchParams } = new URL(request.url)
    const sort = (searchParams.get('sort') || 'latest').toLowerCase() // latest | popular | oldest

    // Get auth session to compute subscription status
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id as string | undefined
    let subscribed = false

    // Get channel videos from our database
    try {
      const videos = await prisma.video.findMany({
        where: {
          OR: [
            // Search by channelId in educator relation
            { 
              educator: { 
                channelId: channelId 
              } 
            },
            // Also search directly if we store channelId in video
            // This will be handled by YouTube API service when it saves videos
          ]
        },
        include: {
          educator: true
        },
        orderBy: { publishedAt: 'desc' },
        take: 50
      })

      // Format videos for the channel page
      channelVideos = videos.map(video => ({
        id: video.id,
        title: video.title,
        thumbnailUrl: video.thumbnailUrl,
        duration: formatDuration(video.duration || 0),
        views: formatViewCount(video.viewCount || 0),
        viewCount: video.viewCount || 0,
        published: formatPublishedDate(video.publishedAt?.toISOString() || ''),
        publishedAt: video.publishedAt?.toISOString() || null,
        channelTitle: video.channelTitle || video.educator?.name || 'Unknown Channel'
      }))
    } catch (dbError) {
      console.error('Database error:', dbError)
    }

    // If we don't have YouTube API access, return what we have from database
    if (!process.env.YOUTUBE_API_KEY) {
      const sorted = sortVideos(channelVideos, sort)
      return NextResponse.json({
        profile: {
          id: channelId,
          name: channelVideos[0]?.channelTitle || 'Unknown Channel',
          handle: '@' + (channelVideos[0]?.channelTitle || 'unknown').toLowerCase().replace(/\s+/g, ''),
          avatarUrl: null,
          bannerUrl: null,
          subscribers: 'N/A',
          videoCount: channelVideos.length
        },
        videos: sorted,
        subscription: { subscribed },
        message: 'Limited data available - YouTube API not configured'
      })
    }

    // Fetch channel details from YouTube API
    try {
      const channelResponse = await youtubeApiService.getChannelInfo(channelId)
      
      if (channelResponse) {
        channelProfile = {
          id: channelResponse.id,
          name: channelResponse.name,
          handle: channelResponse.handle,
          avatarUrl: channelResponse.avatarUrl,
          bannerUrl: channelResponse.bannerUrl,
          subscribers: channelResponse.subscribers,
          videoCount: channelResponse.videoCount,
          description: channelResponse.description
        }

        // Also get channel videos from YouTube if we don't have many in database
        if (channelVideos.length < 5) {
          const ytVideos = await youtubeApiService.getChannelVideos(channelId, 50)
          
          // Merge with database videos, avoiding duplicates
          const existingIds = new Set(channelVideos.map(v => v.id))
          const newVideos = ytVideos.filter((v: any) => !existingIds.has(v.id))
          
          channelVideos = [...channelVideos, ...newVideos]
        }
      }
    } catch (apiError) {
      console.error('YouTube API error:', apiError)
      
      // Fallback to database data
      if (channelVideos.length > 0) {
        channelProfile = {
          id: channelId,
          name: channelVideos[0].channelTitle || 'Unknown Channel',
          handle: '@' + (channelVideos[0].channelTitle || 'unknown').toLowerCase().replace(/\s+/g, ''),
          avatarUrl: null,
          bannerUrl: null,
          subscribers: 'N/A',
          videoCount: channelVideos.length
        }
      }
    }

    // Compute subscription status if user is logged in
    try {
      if (userId) {
        const educator = await prisma.educator.findFirst({ where: { channelId } })
        if (educator) {
          const sub = await (prisma as any).subscription.findUnique({
            where: { userId_educatorId: { userId, educatorId: educator.id } },
          })
          subscribed = !!sub
        }
      }
    } catch (e) {
      // ignore subscription errors
      console.warn('Subscription check failed:', e)
    }

    // If we still don't have channel profile, return error
    if (!channelProfile) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    const sorted = sortVideos(channelVideos, sort)

    return NextResponse.json({
      profile: channelProfile,
      videos: sorted.slice(0, 50),
      subscription: { subscribed }
    })

  } catch (error: any) {
    console.error('Channel API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channel details' },
      { status: 500 }
    )
  }
}

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`
  } else {
    return `${count} views`
  }
}

function formatPublishedDate(dateString: string): string {
  if (!dateString) return ''
  
  const now = new Date()
  const published = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - published.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} hours ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} days ago`
  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths} months ago`
  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} years ago`
}

function sortVideos(videos: any[], sort: string): any[] {
  if (sort === 'popular') {
    return [...videos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
  }
  if (sort === 'oldest') {
    return [...videos].sort((a, b) => new Date(a.publishedAt || 0).getTime() - new Date(b.publishedAt || 0).getTime())
  }
  // default latest
  return [...videos].sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
}
