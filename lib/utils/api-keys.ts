/**
 * YouTube API Key Management Utilities
 * Provides functions for managing multiple YouTube API keys for load balancing
 */

export function getYouTubeApiKey(): string {
  // Check for multiple API keys first (if using multi-key system)
  const apiKeys = [
    process.env.YOUTUBE_API_KEY_1,
    process.env.YOUTUBE_API_KEY_2,
    process.env.YOUTUBE_API_KEY_3,
    process.env.YOUTUBE_API_KEY_4,
    process.env.YOUTUBE_API_KEY_5,
    process.env.YOUTUBE_API_KEY_6,
    process.env.YOUTUBE_API_KEY_7,
    process.env.YOUTUBE_API_KEY_8,
  ].filter(Boolean);

  if (apiKeys.length > 0) {
    // Simple round-robin selection
    const index = Math.floor(Math.random() * apiKeys.length);
    return apiKeys[index] as string;
  }

  // Fallback to single API key
  return process.env.YOUTUBE_API_KEY || '';
}

export function getGoogleApiKey(): string {
  return process.env.GOOGLE_AI_API_KEY || '';
}

export function getAllYouTubeApiKeys(): string[] {
  return [
    process.env.YOUTUBE_API_KEY_1,
    process.env.YOUTUBE_API_KEY_2,
    process.env.YOUTUBE_API_KEY_3,
    process.env.YOUTUBE_API_KEY_4,
    process.env.YOUTUBE_API_KEY_5,
    process.env.YOUTUBE_API_KEY_6,
    process.env.YOUTUBE_API_KEY_7,
    process.env.YOUTUBE_API_KEY_8,
  ].filter(Boolean) as string[];
}

export function getApiKeyCount(): number {
  return getAllYouTubeApiKeys().length;
}