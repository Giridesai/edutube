import { NextRequest, NextResponse } from 'next/server'
import { youtubeApiServiceMultiKey } from '@/lib/youtube-api-service-multikey'

export async function GET(request: NextRequest) {
  try {
    const quotaInfo = youtubeApiServiceMultiKey.getQuotaInfo()
    
    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      quotaInfo: {
        totalUsed: quotaInfo.totalUsed,
        totalLimit: quotaInfo.totalLimit,
        totalRemaining: quotaInfo.totalRemaining,
        usagePercentage: Math.round((quotaInfo.totalUsed / quotaInfo.totalLimit) * 100),
        resetTime: quotaInfo.resetTime,
        resetTimeFormatted: new Date(quotaInfo.resetTime).toLocaleString(),
      },
      keyDetails: quotaInfo.keyDetails.map((key, index) => ({
        ...key,
        keyMasked: `***${index + 1}`,
        usagePercentage: Math.round((key.used / key.limit) * 100),
        healthStatus: key.isActive ? 
          (key.failureCount === 0 ? 'healthy' : 'warning') : 
          'inactive'
      })),
      summary: {
        totalKeys: quotaInfo.keyDetails.length,
        activeKeys: quotaInfo.keyDetails.filter(k => k.isActive).length,
        inactiveKeys: quotaInfo.keyDetails.filter(k => !k.isActive).length,
        keysWithFailures: quotaInfo.keyDetails.filter(k => k.failureCount > 0).length,
        averageUsage: Math.round(quotaInfo.totalUsed / quotaInfo.keyDetails.length),
      },
      recommendations: generateRecommendations(quotaInfo),
      configuration: {
        rotationEnabled: process.env.YOUTUBE_API_ROTATION_ENABLED === 'true',
        monitoringEnabled: process.env.ENABLE_API_MONITORING === 'true',
        quotaPerKey: parseInt(process.env.YOUTUBE_API_QUOTA_PER_KEY || '10000'),
        rateLimitPerKey: parseInt(process.env.YOUTUBE_API_RATE_LIMIT_PER_KEY || '100'),
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error getting multi-key quota info:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get quota information',
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'reset') {
      youtubeApiServiceMultiKey.resetQuotas()
      return NextResponse.json({
        status: 'success',
        message: 'All API key quotas have been reset',
        timestamp: new Date().toISOString()
      })
    }
    
    if (action === 'clear-cache') {
      await youtubeApiServiceMultiKey.clearCache()
      return NextResponse.json({
        status: 'success',
        message: 'Cache has been cleared',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Invalid action. Supported actions: reset, clear-cache'
    }, { status: 400 })
  } catch (error: any) {
    console.error('Error processing quota action:', error)
    return NextResponse.json({
      status: 'error',
      message: 'Failed to process action',
      error: error.message
    }, { status: 500 })
  }
}

function generateRecommendations(quotaInfo: any): string[] {
  const recommendations: string[] = []
  const activeKeys = quotaInfo.keyDetails.filter((k: any) => k.isActive).length
  const totalUsage = quotaInfo.totalUsed
  const usagePercent = (totalUsage / quotaInfo.totalLimit) * 100
  const keysWithFailures = quotaInfo.keyDetails.filter((k: any) => k.failureCount > 0).length

  if (activeKeys === 0) {
    recommendations.push('🚨 CRITICAL: No active API keys! Check your configuration immediately.')
  } else if (activeKeys === 1) {
    recommendations.push('⚠️ Only 1 active API key. Add more keys for better load distribution and redundancy.')
  } else if (activeKeys < 3) {
    recommendations.push('💡 Consider adding more API keys for better load balancing.')
  }

  if (usagePercent > 90) {
    recommendations.push('🚨 Very high quota usage! Add more API keys urgently or reduce API calls.')
  } else if (usagePercent > 80) {
    recommendations.push('⚠️ High quota usage. Consider adding more API keys or optimizing requests.')
  } else if (usagePercent > 60) {
    recommendations.push('💡 Moderate quota usage. Monitor closely and consider adding more keys.')
  }

  if (keysWithFailures > 0) {
    recommendations.push(`⚠️ ${keysWithFailures} key(s) have failures. Check API key validity and network connectivity.`)
  }

  // Check configuration recommendations
  if (process.env.YOUTUBE_API_ROTATION_ENABLED !== 'true') {
    recommendations.push('💡 Enable API key rotation (YOUTUBE_API_ROTATION_ENABLED=true) for better load distribution.')
  }

  if (process.env.ENABLE_API_MONITORING !== 'true') {
    recommendations.push('💡 Enable API monitoring (ENABLE_API_MONITORING=true) for better visibility.')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operating within normal parameters.')
  }

  return recommendations
}
