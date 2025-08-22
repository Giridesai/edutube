import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// GET: Generate shareable link for video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const { searchParams } = new URL(request.url)
    const timestamp = searchParams.get('t') // optional timestamp parameter

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { 
        id: true, 
        title: true, 
        description: true,
        thumbnailUrl: true,
        channelTitle: true,
        duration: true,
      },
    })

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Generate share URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const watchUrl = `${baseUrl}/watch?v=${videoId}${timestamp ? `&t=${timestamp}` : ''}`
    
    // Create shareable content
    const shareData = {
      title: video.title,
      description: video.description?.substring(0, 200) + (video.description && video.description.length > 200 ? '...' : ''),
      url: watchUrl,
      thumbnail: video.thumbnailUrl,
      metadata: {
        videoId: video.id,
        channelTitle: video.channelTitle,
        duration: video.duration,
      },
      social: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `Check out this educational video: "${video.title}"`
        )}&url=${encodeURIComponent(watchUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(watchUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(watchUrl)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(
          `Check out this educational video: "${video.title}" ${watchUrl}`
        )}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(watchUrl)}&text=${encodeURIComponent(
          `Check out this educational video: "${video.title}"`
        )}`,
        email: `mailto:?subject=${encodeURIComponent(
          `Educational Video: ${video.title}`
        )}&body=${encodeURIComponent(
          `I thought you might find this educational video interesting:\n\n"${video.title}"\n${watchUrl}`
        )}`,
      },
    }

    return NextResponse.json({ shareData })
  } catch (error) {
    console.error('Error generating share data:', error)
    return NextResponse.json(
      { error: 'Failed to generate share data' },
      { status: 500 }
    )
  }
}

// POST: Track share events (analytics)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const body = await request.json()
    const { platform, timestamp } = body // platform: 'twitter' | 'facebook' | 'email' etc.

    // Log share event for analytics (could extend to create a ShareEvent model)
    console.log(`Video ${videoId} shared on ${platform} at ${timestamp || new Date().toISOString()}`)

    // Could create a shares tracking table here if needed
    // const shareEvent = await prisma.shareEvent.create({
    //   data: {
    //     videoId,
    //     platform,
    //     timestamp: timestamp ? new Date(timestamp) : new Date(),
    //     // ipAddress, userAgent, etc.
    //   },
    // })

    return NextResponse.json({ 
      success: true, 
      message: 'Share event tracked',
    })
  } catch (error) {
    console.error('Error tracking share event:', error)
    return NextResponse.json(
      { error: 'Failed to track share event' },
      { status: 500 }
    )
  }
}
