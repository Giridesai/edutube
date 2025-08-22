import { NextResponse } from 'next/server'
import { youtubeApiService } from '@/lib/youtube-api-service'

export async function GET() {
  try {
    const quotaInfo = youtubeApiService.getQuotaInfo()
    
    // Calculate quota usage percentage
    const usagePercentage = Math.round((quotaInfo.used / quotaInfo.limit) * 100)
    
    // Determine status based on usage
    let status = 'healthy'
    if (usagePercentage >= 90) {
      status = 'critical'
    } else if (usagePercentage >= 75) {
      status = 'warning'
    } else if (usagePercentage >= 50) {
      status = 'moderate'
    }

    // Calculate time until quota reset
    const now = Date.now()
    const hoursUntilReset = Math.ceil((quotaInfo.resetTime - now) / (1000 * 60 * 60))

    return NextResponse.json({
      status,
      quota: {
        used: quotaInfo.used,
        limit: quotaInfo.limit,
        remaining: quotaInfo.remaining,
        usagePercentage,
        resetTime: quotaInfo.resetTime,
        hoursUntilReset: Math.max(0, hoursUntilReset),
      },
      recommendations: getRecommendations(usagePercentage),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error getting quota info:', error)
    return NextResponse.json(
      { error: 'Failed to get quota information' },
      { status: 500 }
    )
  }
}

function getRecommendations(usagePercentage: number): string[] {
  const recommendations: string[] = []

  if (usagePercentage >= 90) {
    recommendations.push('CRITICAL: Quota usage is very high. API calls may fail.')
    recommendations.push('Consider using database cache instead of API calls.')
    recommendations.push('Reduce search frequency and batch operations.')
  } else if (usagePercentage >= 75) {
    recommendations.push('WARNING: Quota usage is high. Monitor closely.')
    recommendations.push('Prioritize essential API calls only.')
    recommendations.push('Use cached data when possible.')
  } else if (usagePercentage >= 50) {
    recommendations.push('Moderate quota usage. Consider optimizing API calls.')
    recommendations.push('Cache frequently accessed data.')
  } else {
    recommendations.push('Quota usage is healthy.')
    recommendations.push('Continue monitoring to maintain efficiency.')
  }

  return recommendations
}

// Clear cache endpoint (useful for development)
export async function DELETE() {
  try {
    youtubeApiService.clearCache()
    
    return NextResponse.json({
      message: 'YouTube API cache cleared successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
