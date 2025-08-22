#!/usr/bin/env node

/**
 * Test script for YouTube API best practices implementation
 * Run with: node scripts/test-youtube-api.js
 */

const { youtubeApiService } = require('../lib/youtube-api-service')

async function testAPIImplementation() {
  console.log('🚀 Testing YouTube API Best Practices Implementation...\n')

  try {
    // Test 1: Check quota status
    console.log('📊 1. Checking quota status...')
    const quotaInfo = youtubeApiService.getQuotaInfo()
    console.log(`   Quota used: ${quotaInfo.used}/${quotaInfo.limit}`)
    console.log(`   Remaining: ${quotaInfo.remaining}`)
    console.log(`   Usage: ${Math.round((quotaInfo.used / quotaInfo.limit) * 100)}%`)
    console.log(`   Resets at: ${new Date(quotaInfo.resetTime).toLocaleString()}\n`)

    // Test 2: Search videos (should use cache if available)
    console.log('🔍 2. Testing video search...')
    const startTime = Date.now()
    const searchResults = await youtubeApiService.searchVideos('javascript tutorial', 5)
    const searchTime = Date.now() - startTime
    console.log(`   Found ${searchResults.length} videos in ${searchTime}ms`)
    if (searchResults.length > 0) {
      console.log(`   First result: ${searchResults[0].title}`)
    }
    console.log()

    // Test 3: Get video details (should use database first)
    if (searchResults.length > 0) {
      console.log('📹 3. Testing video details...')
      const videoStartTime = Date.now()
      const videoDetails = await youtubeApiService.getVideo(searchResults[0].id)
      const videoTime = Date.now() - videoStartTime
      console.log(`   Retrieved video details in ${videoTime}ms`)
      console.log(`   Title: ${videoDetails.title}`)
      console.log(`   Channel: ${videoDetails.channelTitle}`)
      console.log(`   Duration: ${videoDetails.duration}`)
      console.log()
    }

    // Test 4: Get trending videos (should use cache)
    console.log('🔥 4. Testing trending videos...')
    const trendingStartTime = Date.now()
    const trendingVideos = await youtubeApiService.getTrendingVideos()
    const trendingTime = Date.now() - trendingStartTime
    console.log(`   Found ${trendingVideos.length} trending videos in ${trendingTime}ms`)
    console.log()

    // Test 5: Get comments (if we have a video)
    if (searchResults.length > 0) {
      console.log('💬 5. Testing video comments...')
      try {
        const commentsStartTime = Date.now()
        const comments = await youtubeApiService.getVideoComments(searchResults[0].id, 3)
        const commentsTime = Date.now() - commentsStartTime
        console.log(`   Retrieved ${comments.length} comments in ${commentsTime}ms`)
        if (comments.length > 0) {
          console.log(`   First comment by: ${comments[0].author}`)
        }
      } catch (error) {
        console.log(`   Comments test failed (expected if quota low): ${error.message}`)
      }
      console.log()
    }

    // Test 6: Final quota check
    console.log('📈 6. Final quota usage...')
    const finalQuotaInfo = youtubeApiService.getQuotaInfo()
    const quotaUsed = finalQuotaInfo.used - quotaInfo.used
    console.log(`   Quota used in this test: ${quotaUsed} units`)
    console.log(`   New total usage: ${finalQuotaInfo.used}/${finalQuotaInfo.limit}`)
    console.log(`   New usage percentage: ${Math.round((finalQuotaInfo.used / finalQuotaInfo.limit) * 100)}%`)
    console.log()

    // Performance summary
    console.log('✅ Test Summary:')
    console.log(`   - Search time: ${searchTime}ms (${searchTime < 1000 ? 'Fast' : 'Slow'})`)
    if (searchResults.length > 0) {
      console.log(`   - Video details time: ${videoTime}ms (${videoTime < 500 ? 'Fast' : 'Slow'})`)
    }
    console.log(`   - Trending time: ${trendingTime}ms (${trendingTime < 1000 ? 'Fast' : 'Slow'})`)
    console.log(`   - Total quota used: ${quotaUsed} units`)
    
    if (quotaUsed < 50) {
      console.log('   ✅ Excellent quota efficiency!')
    } else if (quotaUsed < 100) {
      console.log('   ⚠️  Moderate quota usage')
    } else {
      console.log('   ❌ High quota usage - check caching')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.log('\nThis might be expected if:')
    console.log('- YouTube API key is not configured')
    console.log('- API quota is exhausted')
    console.log('- Network connectivity issues')
    console.log('\nThe system should still work with cached/database data.')
  }
}

// Health check function
async function testHealthCheck() {
  console.log('\n🏥 Testing Health Check Endpoint...')
  
  try {
    const response = await fetch('http://localhost:3000/api/health')
    const health = await response.json()
    
    console.log(`Status: ${health.status}`)
    console.log(`Services checked: ${health.summary.total}`)
    console.log(`Healthy: ${health.summary.healthy}`)
    console.log(`Warnings: ${health.summary.warnings}`)
    console.log(`Errors: ${health.summary.errors}`)
    
    if (health.status === 'healthy') {
      console.log('✅ All systems operational!')
    } else {
      console.log('⚠️  Some issues detected - check health endpoint for details')
    }
  } catch (error) {
    console.log('❌ Health check failed - make sure the server is running')
  }
}

// Run tests
async function runAllTests() {
  await testAPIImplementation()
  await testHealthCheck()
  
  console.log('\n🎉 Testing completed!')
  console.log('\nTo monitor the system:')
  console.log('- Health: http://localhost:3000/api/health')
  console.log('- Quota: http://localhost:3000/api/youtube/quota')
  console.log('\nTo clear cache: curl -X DELETE http://localhost:3000/api/youtube/quota')
}

if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testAPIImplementation, testHealthCheck }
