#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Run with: node scripts/test-database.js
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n')
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully!')
    
    // Test a simple query
    console.log('\n2. Testing database query...')
    const userCount = await prisma.user.count()
    console.log(`✅ Database query successful! Found ${userCount} users.`)
    
    // Show database info
    console.log('\n3. Database information:')
    console.log(`   Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@') || 'Not set'}`)
    
    // Test each model
    console.log('\n4. Testing all models...')
    const models = [
      'user', 'video', 'channel', 'playlist', 'playlistVideo',
      'videoInteraction', 'watchHistory', 'subscription', 'videoSummary', 'cache'
    ]
    
    for (const model of models) {
      try {
        const count = await prisma[model].count()
        console.log(`   ✅ ${model}: ${count} records`)
      } catch (error) {
        console.log(`   ❌ ${model}: Error - ${error.message}`)
      }
    }
    
    console.log('\n🎉 Database connection test completed!')
    
  } catch (error) {
    console.error('❌ Database connection failed!')
    console.error('Error details:', error.message)
    
    if (error.message.includes('P1001')) {
      console.log('\n💡 Troubleshooting tips:')
      console.log('   - Check if DATABASE_URL is correctly set')
      console.log('   - Verify database server is running')
      console.log('   - Check network connectivity')
    }
    
    if (error.message.includes('P1003')) {
      console.log('\n💡 Troubleshooting tips:')
      console.log('   - Check if database exists')
      console.log('   - Run: npx prisma db push')
      console.log('   - Verify database permissions')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

async function createSampleData() {
  console.log('\n📝 Creating sample data...')
  
  try {
    // Create a test user
    const user = await prisma.user.upsert({
      where: { email: 'test@edutube.com' },
      update: {},
      create: {
        email: 'test@edutube.com',
        password: 'test123',
        name: 'Test User'
      }
    })
    console.log('✅ Test user created/updated')
    
    // Create a test channel
    const channel = await prisma.channel.upsert({
      where: { id: 'test-channel' },
      update: {},
      create: {
        id: 'test-channel',
        title: 'Test Channel',
        description: 'A test channel for EduTube',
        subscriberCount: 1000
      }
    })
    console.log('✅ Test channel created/updated')
    
    console.log('\n🎉 Sample data created successfully!')
    
  } catch (error) {
    console.error('❌ Failed to create sample data:', error.message)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  console.log('🚀 EduTube Database Test Tool\n')
  
  if (command === 'seed') {
    await testDatabaseConnection()
    await createSampleData()
  } else {
    await testDatabaseConnection()
    
    if (args.includes('--create-sample')) {
      await createSampleData()
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error.message)
    process.exit(1)
  })
}

module.exports = { testDatabaseConnection, createSampleData }
