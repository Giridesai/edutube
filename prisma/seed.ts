import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting to seed database...')

  // Remove all existing educators (they will be added by users)
  await prisma.educator.deleteMany({})
  console.log('Cleared existing educators')

  // Create sample users only
  const password = await bcrypt.hash('password123', 12)
  
  const users = [
    {
      id: 'user-1',
      email: 'student@example.com',
      password: password,
      name: 'Test Student',
      avatar: 'https://via.placeholder.com/100x100/007acc/ffffff?text=S',
    },
    {
      id: 'user-2',
      email: 'learner@example.com',
      password: password,
      name: 'Learning Enthusiast',
      avatar: 'https://via.placeholder.com/100x100/28a745/ffffff?text=L',
    },
  ]

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    })
    console.log(`Created/updated user: ${user.name}`)
  }

  console.log('Database seeding completed!')
  console.log('Test users created with password: password123')
  console.log('Users can now add their own YouTube channels through the app interface.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
