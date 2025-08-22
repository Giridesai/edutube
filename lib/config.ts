export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // External APIs
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
    baseUrl: 'https://www.googleapis.com/youtube/v3',
  },

  // App settings
  app: {
    name: 'EduTube',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  // Rate limiting and pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Video processing
  video: {
    maxDuration: 7200, // 2 hours in seconds
    minDuration: 61, // Minimum 61 seconds to exclude YouTube Shorts
    allowedCategories: ['27'], // Education category
    excludeShorts: true, // Always filter out videos <= 60 seconds
  },
}

// Validation function
export function validateConfig() {
  const required = {
    'DATABASE_URL': process.env.DATABASE_URL,
  }

  const warnings = {
    'YOUTUBE_API_KEY': process.env.YOUTUBE_API_KEY,
  }

  // Check required environment variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
  }

  // Warn about missing optional environment variables
  for (const [key, value] of Object.entries(warnings)) {
    if (!value) {
      console.warn(`Warning: Missing environment variable: ${key}. Some features may be disabled.`)
    }
  }

  console.log('✓ Configuration validated successfully')
}
