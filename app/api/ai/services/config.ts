export const aiConfig = {
  // ChatGPT OSS (local Ollama or hosted) configuration
  chatgptOss: {
    apiUrl: process.env.CHATGPT_OSS_API_URL || 'http://localhost:11434/v1/chat/completions',
    apiKey: process.env.CHATGPT_OSS_API_KEY, // Optional for local instances
    model: process.env.CHATGPT_OSS_MODEL || 'chatgpt-oss-120b',
  },

  // Google AI (Gemini / NotebookLM) configuration
  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    apiUrl: process.env.GOOGLE_AI_API_URL, // optional custom endpoint
    model: process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash', // Updated to use newer model
    projectId: process.env.GOOGLE_PROJECT_ID,
    location: process.env.GOOGLE_LOCATION || 'us-central1',
  },

  // Ollama configuration (for video-summary-ollama route)
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
    model: process.env.OLLAMA_MODEL || 'llama2',
  },

  // AI features configuration
  ai: {
    // Enable summaries when any AI service is configured
    summaryEnabled: !!(process.env.CHATGPT_OSS_API_URL || process.env.CHATGPT_OSS_MODEL || process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_URL),
    maxTokens: 500,
    temperature: 0.3,
    
    // Default fallback settings
    fallback: {
      enabled: true,
      enhancedFallbacks: true, // Use smart fallbacks based on title analysis
    },
    
    // Rate limiting
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerHour: 1000,
    },
  },

  // Visual generation settings
  visual: {
    maxDiagrams: 5,
    enableMermaid: true,
    enableAsciiArt: true,
    diagramTypes: ['flowchart', 'mindmap', 'diagram', 'equation', 'timeline'],
  },
}

// Validation function for AI configuration
export function validateAIConfig() {
  const hasGoogleAI = !!process.env.GOOGLE_API_KEY
  const hasChatGPTOSS = !!(process.env.CHATGPT_OSS_API_URL || process.env.CHATGPT_OSS_MODEL)
  const hasOllama = !!process.env.OLLAMA_API_URL
  const hasAnyAI = hasGoogleAI || hasChatGPTOSS || hasOllama

  if (!hasAnyAI) {
    console.warn('⚠️ No AI services configured. AI features will use fallback responses.')
    console.warn('   Configure GOOGLE_API_KEY, CHATGPT_OSS_*, or OLLAMA_* environment variables to enable AI features.')
  } else {
    console.log('✓ AI services configuration validated successfully')
  }

  return {
    hasGoogle: !!process.env.GOOGLE_API_KEY,
    hasChatGPTOSS: !!(process.env.CHATGPT_OSS_API_URL || process.env.CHATGPT_OSS_MODEL),
    hasOllama: !!process.env.OLLAMA_API_URL,
    hasAnyAI,
  }
}
