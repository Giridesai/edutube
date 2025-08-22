import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/database'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

// Ollama service for local AI models
class OllamaService {
  private apiUrl: string
  private model: string

  constructor() {
    this.apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate'
    this.model = process.env.OLLAMA_MODEL || 'llama2'
  }

  async generateVideoSummary(title: string, description: string) {
    const prompt = `Analyze this educational video and provide a structured response:

Video Title: ${title}
Video Description: ${description.substring(0, 1000)}

Please provide:
1. A concise summary (2-3 sentences)
2. Key learning points (3-5 bullet points) 
3. Difficulty level (beginner, intermediate, advanced)
4. Subject category (math, science, history, programming, etc.)

Format as JSON:
{
  "summary": "...",
  "keyPoints": ["...", "...", "..."],
  "difficulty": "...",
  "subject": "..."
}`

    const requestBody = {
      model: this.model,
      prompt: prompt,
      stream: false,
      format: 'json'
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      let result

      try {
        result = JSON.parse(data.response || '{}')
      } catch (e) {
        // If JSON parsing fails, create structured response from text
        const textResponse = data.response || ''
        result = this.parseTextResponse(textResponse, title)
      }

      // Validate and ensure proper structure
      return {
        summary: result.summary || this.generateFallbackSummary(title),
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : this.generateFallbackKeyPoints(),
        difficulty: result.difficulty || 'intermediate',
        subject: result.subject || this.inferSubject(title)
      }

    } catch (error) {
      console.error('Ollama service error:', error)
      return this.generateFallbackResponse(title)
    }
  }

  private parseTextResponse(text: string, title: string) {
    // Try to extract structured information from unstructured text
    const lines = text.split('\n').filter(line => line.trim())
    
    return {
      summary: lines.find(line => line.toLowerCase().includes('summary'))?.replace(/summary:?/i, '').trim() || 
               this.generateFallbackSummary(title),
      keyPoints: lines.filter(line => line.startsWith('•') || line.startsWith('-')).slice(0, 5) ||
                this.generateFallbackKeyPoints(),
      difficulty: text.toLowerCase().includes('advanced') ? 'advanced' : 
                 text.toLowerCase().includes('beginner') ? 'beginner' : 'intermediate',
      subject: this.inferSubject(title)
    }
  }

  private generateFallbackSummary(title: string): string {
    const subject = this.inferSubject(title)
    return `This educational video covers important concepts in ${subject}. The content provides structured learning material with clear explanations and practical examples.`
  }

  private generateFallbackKeyPoints(): string[] {
    return [
      'Educational content with structured presentation',
      'Clear explanations of key concepts',
      'Practical examples and applications',
      'Suitable for self-paced learning'
    ]
  }

  private generateFallbackResponse(title: string) {
    const subject = this.inferSubject(title)
    return {
      summary: this.generateFallbackSummary(title),
      keyPoints: this.generateFallbackKeyPoints(),
      difficulty: 'intermediate',
      subject
    }
  }

  private inferSubject(title: string): string {
    const titleLower = title.toLowerCase()
    
    if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra')) {
      return 'mathematics'
    } else if (titleLower.includes('programming') || titleLower.includes('code') || titleLower.includes('javascript') || titleLower.includes('python')) {
      return 'programming'
    } else if (titleLower.includes('science') || titleLower.includes('physics') || titleLower.includes('chemistry') || titleLower.includes('biology')) {
      return 'science'
    } else if (titleLower.includes('history') || titleLower.includes('war') || titleLower.includes('ancient')) {
      return 'history'
    } else if (titleLower.includes('language') || titleLower.includes('english') || titleLower.includes('grammar')) {
      return 'language'
    }
    
    return 'general'
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/api/generate', '/api/tags')}`, {
        method: 'GET',
      })
      return response.ok
    } catch (error) {
      console.error('Ollama connection test failed:', error)
      return false
    }
  }
}

const ollamaService = new OllamaService()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Check if summary already exists in database
    const existingVideo = await prisma.video.findUnique({
      where: { id: videoId },
    })

    if (existingVideo?.summary && !existingVideo.summary.includes('technical limitations')) {
      return NextResponse.json({
        summary: existingVideo.summary,
        keyPoints: JSON.parse(existingVideo.keyPoints || '[]'),
        difficulty: existingVideo.difficulty,
        subject: existingVideo.subject,
        source: 'cached'
      })
    }

    // Test Ollama connection
    const isConnected = await ollamaService.testConnection()
    console.log(`Ollama connection: ${isConnected ? 'Connected' : 'Not available'}`)

    // Get video details from YouTube
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
    })

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const video = videoResponse.data.items[0]
    const snippet = video.snippet
    const title = snippet?.title || ''
    const description = snippet?.description || ''

    // Generate AI summary using Ollama
    const analysis = await ollamaService.generateVideoSummary(title, description)

    // Update database with AI analysis
    try {
      await prisma.video.upsert({
        where: { id: videoId },
        update: {
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          difficulty: analysis.difficulty,
          subject: analysis.subject,
        },
        create: {
          id: videoId,
          title: title,
          description: description,
          summary: analysis.summary,
          keyPoints: JSON.stringify(analysis.keyPoints),
          difficulty: analysis.difficulty,
          subject: analysis.subject,
          tags: JSON.stringify([]),
        },
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      // Continue with the response even if DB save fails
    }

    return NextResponse.json({
      ...analysis,
      source: isConnected ? 'ollama' : 'fallback',
      model: ollamaService['model']
    })
  } catch (error) {
    console.error('Ollama video summary error:', error)
    
    // Return fallback response
    return NextResponse.json({
      summary: "This educational video contains valuable learning content. Ollama AI analysis is temporarily unavailable.",
      keyPoints: [
        "Educational video content",
        "Learning objectives covered", 
        "Key concepts explained",
        "Practical knowledge shared"
      ],
      difficulty: "intermediate",
      subject: "general",
      source: 'fallback',
      error: 'Ollama service temporarily unavailable'
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description } = body
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Generate AI summary for custom content using Ollama
    const analysis = await ollamaService.generateVideoSummary(title, description || '')
    
    return NextResponse.json({
      ...analysis,
      source: 'ollama',
      model: ollamaService['model']
    })
  } catch (error) {
    console.error('Ollama custom summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary with Ollama' },
      { status: 500 }
    )
  }
}