import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load environment first
dotenv.config()

// Then import the service manager
import { aiServiceManager, AIServiceManager } from '../app/api/ai/services/ai-service-manager'

const prisma = new PrismaClient()

async function updateVideoSummaries() {
  console.log('🔍 Finding videos with fallback summaries...')
  
  // Find videos with the old fallback message
  const videosToUpdate = await prisma.video.findMany({
    where: {
      summary: {
        contains: 'technical limitations'
      }
    },
    select: {
      id: true,
      title: true,
      description: true,
      summary: true
    }
  })

  console.log(`📊 Found ${videosToUpdate.length} videos to update`)

  if (videosToUpdate.length === 0) {
    console.log('✅ No videos need updating')
    return
  }

  // Reset and get fresh AI service manager instance
  AIServiceManager.resetInstance()
  const serviceManager = AIServiceManager.getInstance()

  console.log('🤖 Testing AI service connection...')
  const isConnected = await serviceManager.testConnection()
  console.log(`🔗 AI Service (${serviceManager.getServiceName()}): ${isConnected ? 'Connected' : 'Not available'}`)

  let updatedCount = 0
  let failedCount = 0

  for (const video of videosToUpdate) {
    try {
      console.log(`\n📹 Processing: ${video.title.substring(0, 50)}...`)
      
      // Generate new AI summary
      const analysis = await serviceManager.generateVideoSummary(
        video.title,
        video.description || ''
      )

      // Update the video in database
      await prisma.video.update({
        where: { id: video.id },
        data: {
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          difficulty: analysis.difficulty,
          subject: analysis.subject
        }
      })

      console.log(`✅ Updated: ${video.id}`)
      console.log(`   Subject: ${analysis.subject}, Difficulty: ${analysis.difficulty}`)
      updatedCount++
      
    } catch (error) {
      console.error(`❌ Failed to update ${video.id}:`, error)
      failedCount++
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\n📈 Summary:`)
  console.log(`✅ Successfully updated: ${updatedCount} videos`)
  console.log(`❌ Failed to update: ${failedCount} videos`)
  console.log(`🎯 AI Service used: ${serviceManager.getServiceName()}`)
  
  await prisma.$disconnect()
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateVideoSummaries()
    .then(() => {
      console.log('\n🎉 Video summary update completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Update failed:', error)
      process.exit(1)
    })
}

export { updateVideoSummaries }
