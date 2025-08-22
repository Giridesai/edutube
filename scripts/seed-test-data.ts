/**
 * Script to seed test data for subscription system
 * Run with: npx tsx scripts/seed-test-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test data for subscription system...')

  // Create test user if not exists
  let user
  try {
    user = await prisma.user.findUnique({
      where: { id: 'user-1' }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          password: 'test-password-hash', // In a real app, this would be properly hashed
        },
      })
      console.log('✅ Created test user:', user.email)
    } else {
      console.log('✅ Found existing test user:', user.email)
    }
  } catch (error) {
    console.log('User might already exist, trying to find by email...')
    user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    })
    if (!user) {
      throw new Error('Could not create or find test user')
    }
    console.log('✅ Found existing test user:', user.email)
  }

  // Create some sample educators/channels
  const educators = [
    {
      id: 'educator-1',
      name: 'Traversy Media',
      channelId: 'UC29ju8bIPH5as8OGnQzwJyA',
      avatarUrl: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      description: 'Web development tutorials and programming courses'
    },
    {
      id: 'educator-2', 
      name: 'The Coding Train',
      channelId: 'UCvjgXvBlbQiydffZU7m1_aw',
      avatarUrl: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      description: 'Creative coding tutorials and programming challenges'
    },
    {
      id: 'educator-3',
      name: 'FreeCodeCamp',
      channelId: 'UC8butISFwT-Wl7EV0hUK0BQ',
      avatarUrl: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      description: 'Learn to code for free with tutorials and courses'
    },
    {
      id: 'educator-4',
      name: 'Web Dev Simplified',
      channelId: 'UCFbNIlppjAuEX4znoulh0Cw',
      avatarUrl: 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj',
      description: 'Simplified web development tutorials'
    }
  ]

  // Create educators
  for (const educatorData of educators) {
    const educator = await prisma.educator.upsert({
      where: { id: educatorData.id },
      update: {},
      create: educatorData,
    })
    console.log('✅ Created/found educator:', educator.name)
  }

  // Create some test subscriptions (subscribe to first 2 educators)
  for (let i = 0; i < 2; i++) {
    const subscription = await prisma.subscription.upsert({
      where: {
        userId_educatorId: {
          userId: user.id,
          educatorId: educators[i].id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        educatorId: educators[i].id,
      },
    })
    console.log('✅ Created/found subscription to:', educators[i].name)
  }

  console.log('🎉 Test data seeding completed!')
  console.log('\nYou can now:')
  console.log('1. Visit the watch page and test subscribing/unsubscribing')
  console.log('2. Check the subscriptions page to see subscribed channels')
  console.log('3. View the home page to see subscription status in featured educators')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
