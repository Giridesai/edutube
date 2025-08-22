#!/usr/bin/env node

/**
 * Multi-API Key Management Script
 * Helps monitor, test, and manage multiple YouTube API keys
 * Run with: node scripts/manage-api-keys.js
 */

require('dotenv').config()
const { youtubeApiServiceMultiKey } = require('../lib/youtube-api-service-multikey')

// ANSI color codes for better console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m',
}

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function checkAPIKeyConfiguration() {
  colorLog('blue', '\n🔑 Checking API Key Configuration...\n')
  
  const apiKeys = []
  for (let i = 1; i <= 8; i++) {
    const key = process.env[`YOUTUBE_API_KEY_${i}`]
    if (key && key !== `your_youtube_api_key_${i}_here`) {
      apiKeys.push({
        id: `YOUTUBE_API_KEY_${i}`,
        key: key.substring(0, 10) + '...',
        configured: true
      })
    } else {
      apiKeys.push({
        id: `YOUTUBE_API_KEY_${i}`,
        key: 'Not configured',
        configured: false
      })
    }
  }

  // Check legacy key
  const legacyKey = process.env.YOUTUBE_API_KEY
  if (legacyKey && legacyKey !== 'your_primary_youtube_api_key_here') {
    apiKeys.push({
      id: 'YOUTUBE_API_KEY (Legacy)',
      key: legacyKey.substring(0, 10) + '...',
      configured: true
    })
  }

  const configuredCount = apiKeys.filter(k => k.configured).length
  
  console.log('API Key Status:')
  apiKeys.forEach(key => {
    if (key.configured) {
      colorLog('green', `  ✅ ${key.id}: ${key.key}`)
    } else {
      colorLog('red', `  ❌ ${key.id}: ${key.key}`)
    }
  })

  colorLog('cyan', `\n📊 Summary: ${configuredCount} API keys configured`)
  
  if (configuredCount === 0) {
    colorLog('red', '⚠️  WARNING: No API keys are configured!')
    return false
  } else if (configuredCount === 1) {
    colorLog('yellow', '⚠️  Only 1 API key configured. Consider adding more for load balancing.')
  } else {
    colorLog('green', '✅ Multiple API keys configured for load balancing!')
  }

  return configuredCount > 0
}

async function testAPIKeys() {
  colorLog('blue', '\n🧪 Testing API Keys...\n')
  
  try {
    // Test a simple search request
    console.log('Testing search functionality...')
    const searchResults = await youtubeApiServiceMultiKey.searchVideos('javascript tutorial', 3)
    
    if (searchResults.length > 0) {
      colorLog('green', `✅ Search test passed - Found ${searchResults.length} videos`)
      console.log(`   First result: "${searchResults[0].title}"`)
    } else {
      colorLog('yellow', '⚠️  Search test returned no results')
    }

    // Test video details
    if (searchResults.length > 0) {
      console.log('\nTesting video details...')
      const videoDetails = await youtubeApiServiceMultiKey.getVideo(searchResults[0].id)
      colorLog('green', `✅ Video details test passed`)
      console.log(`   Video: "${videoDetails.title}"`)
      console.log(`   Duration: ${videoDetails.duration}`)
    }

    return true
  } catch (error) {
    colorLog('red', `❌ API test failed: ${error.message}`)
    return false
  }
}

async function showQuotaStatus() {
  colorLog('blue', '\n📊 API Key Quota Status...\n')
  
  try {
    const quotaInfo = youtubeApiServiceMultiKey.getQuotaInfo()
    
    console.log('Overall Quota Status:')
    colorLog('cyan', `  Total Used: ${quotaInfo.totalUsed}`)
    colorLog('cyan', `  Total Limit: ${quotaInfo.totalLimit}`)
    colorLog('cyan', `  Total Remaining: ${quotaInfo.totalRemaining}`)
    
    const usagePercent = Math.round((quotaInfo.totalUsed / quotaInfo.totalLimit) * 100)
    if (usagePercent < 50) {
      colorLog('green', `  Usage: ${usagePercent}% (Good)`)
    } else if (usagePercent < 80) {
      colorLog('yellow', `  Usage: ${usagePercent}% (Moderate)`)
    } else {
      colorLog('red', `  Usage: ${usagePercent}% (High)`)
    }

    console.log('\nPer-Key Status:')
    quotaInfo.keyDetails.forEach((key, index) => {
      const keyUsagePercent = Math.round((key.used / key.limit) * 100)
      const status = key.isActive ? 'Active' : 'Inactive'
      const statusColor = key.isActive ? 'green' : 'red'
      
      console.log(`  Key ${index + 1}:`)
      colorLog(statusColor, `    Status: ${status}`)
      console.log(`    Used: ${key.used}/${key.limit} (${keyUsagePercent}%)`)
      console.log(`    Remaining: ${key.remaining}`)
      
      if (key.failureCount > 0) {
        colorLog('yellow', `    Failures: ${key.failureCount}`)
      }
    })

    const resetTime = new Date(quotaInfo.resetTime).toLocaleString()
    console.log(`\nQuota resets at: ${resetTime}`)
    
  } catch (error) {
    colorLog('red', `❌ Failed to get quota status: ${error.message}`)
  }
}

async function resetQuotas() {
  colorLog('blue', '\n🔄 Resetting API Key Quotas...\n')
  
  try {
    youtubeApiServiceMultiKey.resetQuotas()
    colorLog('green', '✅ All API key quotas have been reset')
  } catch (error) {
    colorLog('red', `❌ Failed to reset quotas: ${error.message}`)
  }
}

async function monitorAPIUsage() {
  colorLog('blue', '\n👀 Starting API Usage Monitor...\n')
  colorLog('cyan', 'Press Ctrl+C to stop monitoring')
  
  const interval = setInterval(async () => {
    console.clear()
    colorLog('bright', '='.repeat(60))
    colorLog('bright', '       YOUTUBE API USAGE MONITOR')
    colorLog('bright', '='.repeat(60))
    
    await showQuotaStatus()
    
    colorLog('cyan', `\nLast updated: ${new Date().toLocaleTimeString()}`)
  }, 30000) // Update every 30 seconds

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    clearInterval(interval)
    colorLog('yellow', '\n\n👋 Monitoring stopped')
    process.exit(0)
  })
}

async function showRecommendations() {
  colorLog('blue', '\n💡 API Key Management Recommendations...\n')
  
  const quotaInfo = youtubeApiServiceMultiKey.getQuotaInfo()
  const activeKeys = quotaInfo.keyDetails.filter(k => k.isActive).length
  const totalUsage = quotaInfo.totalUsed
  const usagePercent = (totalUsage / quotaInfo.totalLimit) * 100

  console.log('Recommendations:')
  
  if (activeKeys === 0) {
    colorLog('red', '  🚨 CRITICAL: No active API keys! Please check your configuration.')
  } else if (activeKeys === 1) {
    colorLog('yellow', '  ⚠️  Only 1 active API key. Consider adding more for better load distribution.')
  } else if (activeKeys < 3) {
    colorLog('yellow', '  💡 Consider adding more API keys for better redundancy.')
  } else {
    colorLog('green', '  ✅ Good number of active API keys for load balancing.')
  }

  if (usagePercent > 80) {
    colorLog('red', '  🚨 High quota usage! Consider adding more API keys or optimizing requests.')
  } else if (usagePercent > 60) {
    colorLog('yellow', '  ⚠️  Moderate quota usage. Monitor closely and consider adding more keys.')
  } else {
    colorLog('green', '  ✅ Quota usage is within safe limits.')
  }

  // Check if rotation is enabled
  const rotationEnabled = process.env.YOUTUBE_API_ROTATION_ENABLED === 'true'
  if (!rotationEnabled) {
    colorLog('yellow', '  💡 Consider enabling API key rotation for better load distribution.')
  }

  // Check if monitoring is enabled
  const monitoringEnabled = process.env.ENABLE_API_MONITORING === 'true'
  if (!monitoringEnabled) {
    colorLog('yellow', '  💡 Consider enabling API monitoring for better visibility.')
  }

  console.log('\nConfiguration Tips:')
  console.log('  • Set YOUTUBE_API_ROTATION_ENABLED=true for round-robin load balancing')
  console.log('  • Set ENABLE_API_MONITORING=true for detailed usage tracking')
  console.log('  • Set LOG_API_KEY_ROTATION=true to log which keys are being used')
  console.log('  • Monitor quota usage regularly to avoid service interruptions')
  console.log('  • Keep backup API keys ready for failover scenarios')
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  colorLog('bright', '🚀 YouTube API Multi-Key Management Tool\n')

  if (!command) {
    colorLog('cyan', 'Available commands:')
    console.log('  check        - Check API key configuration')
    console.log('  test         - Test API functionality')
    console.log('  quota        - Show quota status')
    console.log('  reset        - Reset all quotas (for testing)')
    console.log('  monitor      - Real-time usage monitoring')
    console.log('  recommend    - Show recommendations')
    console.log('  all          - Run check, test, and quota commands')
    console.log('\nExample: node scripts/manage-api-keys.js check')
    return
  }

  switch (command) {
    case 'check':
      await checkAPIKeyConfiguration()
      break
    case 'test':
      await testAPIKeys()
      break
    case 'quota':
      await showQuotaStatus()
      break
    case 'reset':
      await resetQuotas()
      break
    case 'monitor':
      await monitorAPIUsage()
      break
    case 'recommend':
      await showRecommendations()
      break
    case 'all':
      const hasKeys = await checkAPIKeyConfiguration()
      if (hasKeys) {
        await testAPIKeys()
        await showQuotaStatus()
        await showRecommendations()
      }
      break
    default:
      colorLog('red', `❌ Unknown command: ${command}`)
      colorLog('cyan', 'Use "node scripts/manage-api-keys.js" to see available commands')
  }
}

if (require.main === module) {
  main().catch(error => {
    colorLog('red', `❌ Error: ${error.message}`)
    process.exit(1)
  })
}

module.exports = {
  checkAPIKeyConfiguration,
  testAPIKeys,
  showQuotaStatus,
  resetQuotas,
  showRecommendations
}
