import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function removeShorts() {
  console.log('Removing YouTube Shorts from database...')

  // Remove videos that are 60 seconds or less (YouTube Shorts)
  const deletedShorts = await prisma.video.deleteMany({
    where: {
      duration: {
        lte: 60
      }
    }
  })

  console.log(`Removed ${deletedShorts.count} YouTube Shorts from database`)

  // Also remove any videos with null or 0 duration that might be shorts
  const deletedInvalid = await prisma.video.deleteMany({
    where: {
      OR: [
        { duration: null },
        { duration: 0 }
      ]
    }
  })

  console.log(`Removed ${deletedInvalid.count} videos with invalid duration`)
  console.log('Cleanup completed!')
}

removeShorts()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
