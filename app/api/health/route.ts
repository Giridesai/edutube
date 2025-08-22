import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { youtubeApiService } from '@/lib/youtube-api-service'
import { cacheManager } from '@/lib/cache-manager'

interface HealthCheck {
  service: string
  status: 'healthy' | 'warning' | 'error'
  message?: string
  details?: any
}

export async function GET() {
  const checks: HealthCheck[] = []
  
  // Database health check
  try {
    await prisma.$queryRaw`SELECT 1`
    
    // Get basic stats
    const [userCount, educatorCount, videoCount] = await Promise.all([
      prisma.user.count(),
      prisma.educator.count(),
      prisma.video.count(),
    ])
    
    checks.push({
      service: 'database',
      status: 'healthy',
      message: 'Database connection successful',
      details: {
        users: userCount,
        educators: educatorCount,
        videos: videoCount,
      }
    })
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'error',
      message: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // YouTube API health check
  try {
    const quotaInfo = youtubeApiService.getQuotaInfo()
    const usagePercentage = Math.round((quotaInfo.used / quotaInfo.limit) * 100)
    
    let status: 'healthy' | 'warning' | 'error' = 'healthy'
    let message = `YouTube API quota usage: ${usagePercentage}%`
    
    if (usagePercentage >= 90) {
      status = 'error'
      message = `Critical: YouTube API quota at ${usagePercentage}%`
    } else if (usagePercentage >= 75) {
      status = 'warning'
      message = `Warning: YouTube API quota at ${usagePercentage}%`
    }

    checks.push({
      service: 'youtube_api',
      status,
      message,
      details: {
        quotaUsed: quotaInfo.used,
        quotaLimit: quotaInfo.limit,
        quotaRemaining: quotaInfo.remaining,
        usagePercentage,
        resetTime: new Date(quotaInfo.resetTime).toISOString()
      }
    })
  } catch (error) {
    checks.push({
      service: 'youtube_api',
      status: 'error',
      message: 'YouTube API health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Cache system health check
  try {
    const cacheStats = await cacheManager.getStats()
    checks.push({
      service: 'cache',
      status: 'healthy',
      message: 'Cache system operational',
      details: {
        memoryEntries: cacheStats.memoryEntries,
        databaseEntries: cacheStats.databaseEntries,
        totalSize: cacheStats.totalSize,
        hitRate: `${cacheStats.hitRate}%`
      }
    })
  } catch (error) {
    checks.push({
      service: 'cache',
      status: 'warning',
      message: 'Cache system check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }

  // Environment variables check
  const envChecks = {
    'YOUTUBE_API_KEY': !!process.env.YOUTUBE_API_KEY,
    'DATABASE_URL': !!process.env.DATABASE_URL,
    'NEXTAUTH_SECRET': !!process.env.NEXTAUTH_SECRET,
    'NEXTAUTH_URL': !!process.env.NEXTAUTH_URL,
  }

  const missingEnvVars = Object.entries(envChecks)
    .filter(([_, exists]) => !exists)
    .map(([key, _]) => key)

  if (missingEnvVars.length === 0) {
    checks.push({
      service: 'environment',
      status: 'healthy',
      message: 'All required environment variables are set'
    })
  } else {
    checks.push({
      service: 'environment',
      status: 'warning',
      message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      details: { missing: missingEnvVars }
    })
  }

  // Determine overall system health
  const hasErrors = checks.some(check => check.status === 'error')
  const hasWarnings = checks.some(check => check.status === 'warning')
  
  let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy'
  if (hasErrors) {
    overallStatus = 'error'
  } else if (hasWarnings) {
    overallStatus = 'warning'
  }

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      errors: checks.filter(c => c.status === 'error').length,
    }
  }

  // Return appropriate HTTP status based on health
  const httpStatus = overallStatus === 'error' ? 503 : 200
  
  return NextResponse.json(response, { status: httpStatus })
}

// Maintenance endpoint for cleaning up expired cache
export async function DELETE() {
  try {
    // Clean up expired database cache entries
    const cleanedCount = await cacheManager.cleanupDatabase()
    
    return NextResponse.json({
      message: 'Cache cleanup completed',
      cleanedEntries: cleanedCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cache cleanup failed:', error)
    return NextResponse.json(
      { 
        error: 'Cache cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
