import { prisma } from '@/lib/database'
import type { PrismaClient } from '@prisma/client'

// Ensure TypeScript recognizes the cache model
const typedPrisma = prisma as PrismaClient
 


interface CacheEntry<T> {
  key: string
  data: T
  expiresAt: Date
  tags?: string[]
  createdAt: Date
  accessCount: number
  lastAccessed: Date
}

interface CacheConfig {
  ttl: number // Time to live in seconds
  tags?: string[] // Cache tags for group invalidation
  namespace?: string // Cache namespace
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private readonly MAX_MEMORY_ENTRIES = 1000
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

  constructor() {
    // Cleanup expired entries periodically
    setInterval(() => {
      this.cleanupMemoryCache()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Generate cache key with optional namespace
   */
  private generateKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key
  }

  /**
   * Get data from cache (memory first, then database)
   */
  async get<T>(key: string, config?: { namespace?: string }): Promise<T | null> {
    const fullKey = this.generateKey(key, config?.namespace)
    
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(fullKey)
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      // Update access statistics
      memoryEntry.accessCount++
      memoryEntry.lastAccessed = new Date()
      return memoryEntry.data as T
    }

    // Remove expired memory cache entry
    if (memoryEntry && memoryEntry.expiresAt <= new Date()) {
      this.memoryCache.delete(fullKey)
    }

    // Check database cache
    try {
      const dbEntry = await typedPrisma.cache.findUnique({
        where: { key: fullKey }
      })

      if (dbEntry && dbEntry.expiresAt > new Date()) {
        const data = JSON.parse(dbEntry.data)
        
        // Store in memory cache for faster access
        this.setMemoryCache(fullKey, data, dbEntry.expiresAt, dbEntry.tags ? dbEntry.tags.split(',') : undefined)
        
        // Update access statistics in database
        await typedPrisma.cache.update({
          where: { key: fullKey },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date()
          }
        }).catch(() => {}) // Ignore errors for statistics update

        return data as T
      }

      // Remove expired database entry
      if (dbEntry && dbEntry.expiresAt <= new Date()) {
        await typedPrisma.cache.delete({
          where: { key: fullKey }
        }).catch(() => {}) // Ignore cleanup errors
      }
    } catch (error) {
      console.error('Error reading from database cache:', error)
    }

    return null
  }

  /**
   * Set data in cache (both memory and database)
   */
  async set<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    const fullKey = this.generateKey(key, config.namespace)
    const expiresAt = new Date(Date.now() + config.ttl * 1000)
    const tags = config.tags?.join(',')

    // Set in memory cache
    this.setMemoryCache(fullKey, data, expiresAt, config.tags)

    // Set in database cache
    try {
      await typedPrisma.cache.upsert({
        where: { key: fullKey },
        create: {
          key: fullKey,
          data: JSON.stringify(data),
          expiresAt,
          tags,
          createdAt: new Date(),
          accessCount: 0,
          lastAccessed: new Date()
        },
        update: {
          data: JSON.stringify(data),
          expiresAt,
          tags,
          accessCount: 0,
          lastAccessed: new Date()
        }
      })
    } catch (error) {
      console.error('Error writing to database cache:', error)
      // Continue without database cache if it fails
    }
  }

  /**
   * Set data only in memory cache
   */
  private setMemoryCache<T>(key: string, data: T, expiresAt: Date, tags?: string[]): void {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      this.evictLeastRecentlyUsed()
    }

    this.memoryCache.set(key, {
      key,
      data,
      expiresAt,
      tags,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessed: new Date()
    })
  }

  /**
   * Delete specific cache entry
   */
  async delete(key: string, config?: { namespace?: string }): Promise<void> {
    const fullKey = this.generateKey(key, config?.namespace)
    
    // Remove from memory cache
    this.memoryCache.delete(fullKey)
    
    // Remove from database cache
    try {
      await typedPrisma.cache.delete({
        where: { key: fullKey }
      })
    } catch (error) {
      // Ignore errors if entry doesn't exist
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    // Remove from memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.tags && tags.some(tag => entry.tags!.includes(tag))) {
        this.memoryCache.delete(key)
      }
    }

    // Remove from database cache
    try {
      for (const tag of tags) {
        await typedPrisma.cache.deleteMany({
          where: {
            tags: { contains: tag }
          }
        })
      }
    } catch (error) {
      console.error('Error invalidating cache by tags:', error)
    }
  }

  /**
   * Clear all cache entries with optional namespace filter
   */
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      // Clear specific namespace
      const prefix = `${namespace}:`
      
      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key)
        }
      }
      
      // Clear from database cache
      try {
        await typedPrisma.cache.deleteMany({
          where: {
            key: { startsWith: prefix }
          }
        })
      } catch (error) {
        console.error('Error clearing namespace cache:', error)
      }
    } else {
      // Clear all cache
      this.memoryCache.clear()
      
      try {
        await typedPrisma.cache.deleteMany()
      } catch (error) {
        console.error('Error clearing all cache:', error)
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number
    databaseEntries: number
    totalSize: number
    hitRate: number
  }> {
    const memoryEntries = this.memoryCache.size
    
    let databaseEntries = 0
    let totalSize = 0
    
    try {
      const dbStats = await typedPrisma.cache.aggregate({
        _count: { key: true },
        _sum: { accessCount: true }
      })
      
      databaseEntries = dbStats._count.key || 0
      totalSize = memoryEntries + databaseEntries
    } catch (error) {
      console.error('Error getting cache stats:', error)
    }

    // Calculate hit rate (simplified)
    let hitRate = 0
    try {
      const totalAccesses = Array.from(this.memoryCache.values())
        .reduce((sum, entry) => sum + entry.accessCount, 0)
      
      if (totalAccesses > 0) {
        hitRate = Math.round((totalAccesses / (totalAccesses + totalSize)) * 100)
      }
    } catch (error) {
      console.error('Error calculating hit rate:', error)
    }

    return {
      memoryEntries,
      databaseEntries,
      totalSize,
      hitRate
    }
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = new Date()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key)
      }
    }
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null
    let oldestTime = new Date()

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey)
    }
  }

  /**
   * Cleanup expired database cache entries
   */
  async cleanupDatabase(): Promise<number> {
    try {
      const result = await typedPrisma.cache.deleteMany({
        where: {
          expiresAt: { lte: new Date() }
        }
      })
      
      return result.count
    } catch (error) {
      console.error('Error cleaning up database cache:', error)
      return 0
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager()

// Cache configuration presets
export const cacheConfigs = {
  // YouTube video data - cache for 24 hours
  video: {
    ttl: 24 * 60 * 60, // 24 hours
    tags: ['youtube', 'video'],
    namespace: 'youtube'
  },
  
  // Search results - cache for 1 hour
  search: {
    ttl: 60 * 60, // 1 hour
    tags: ['youtube', 'search'],
    namespace: 'youtube'
  },
  
  // Trending videos - cache for 30 minutes
  trending: {
    ttl: 30 * 60, // 30 minutes
    tags: ['youtube', 'trending'],
    namespace: 'youtube'
  },
  
  // Comments - cache for 6 hours
  comments: {
    ttl: 6 * 60 * 60, // 6 hours
    tags: ['youtube', 'comments'],
    namespace: 'youtube'
  },
  
  // Channel data - cache for 12 hours
  channel: {
    ttl: 12 * 60 * 60, // 12 hours
    tags: ['youtube', 'channel'],
    namespace: 'youtube'
  },
  
  // AI-generated content - cache for 7 days
  ai: {
    ttl: 7 * 24 * 60 * 60, // 7 days
    tags: ['ai'],
    namespace: 'ai'
  }
}

/**
 * Utility function to get or set cache with automatic fallback
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheManager.get<T>(key, { namespace: config.namespace })
  if (cached !== null) {
    return cached
  }

  // If not in cache, fetch the data
  const data = await fetcher()
  
  // Store in cache for next time
  await cacheManager.set(key, data, config)
  
  return data
}
