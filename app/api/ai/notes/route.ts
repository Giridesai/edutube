import { NextRequest, NextResponse } from 'next/server'
import { AIServiceManager } from '../services/ai-service-manager'
import { visualGenerationService } from '../services/visual-generation-service'
import { google } from 'googleapis'
import { getYouTubeApiKey } from '@/lib/utils/api-keys'

const youtube = google.youtube({
  version: 'v3',
  auth: getYouTubeApiKey(),
})

// Helper function to infer subject from title
function inferSubject(title: string): string {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra') || titleLower.includes('geometry')) {
    return 'mathematics'
  } else if (titleLower.includes('physics') || titleLower.includes('chemistry') || titleLower.includes('biology') || titleLower.includes('science')) {
    return 'science'
  } else if (titleLower.includes('history') || titleLower.includes('war') || titleLower.includes('ancient')) {
    return 'history'
  } else if (titleLower.includes('programming') || titleLower.includes('code') || titleLower.includes('javascript') || titleLower.includes('python')) {
    return 'programming'
  } else if (titleLower.includes('language') || titleLower.includes('english') || titleLower.includes('grammar')) {
    return 'language'
  }
  
  return 'general'
}

// Generate diagrams for notes
async function generateNoteDiagrams(title: string, description: string, subject: string) {
  const diagrams = []
  
  try {
    // Generate subject-specific diagram
    const mainDiagram = await visualGenerationService.generateDiagramForContent(
      subject,
      `${title} ${description}`,
      'diagram'
    )
    
    diagrams.push({
      id: mainDiagram.id,
      type: 'diagram' as const,
      title: mainDiagram.title,
      description: mainDiagram.description,
      asciiArt: mainDiagram.asciiArt,
      mermaidCode: mainDiagram.mermaidCode
    })
    
    // Generate a concept map if we have enough content
    if (description.length > 100) {
      const conceptDiagram = await visualGenerationService.generateDiagramForContent(
        'general',
        description.substring(0, 500),
        'mindmap'
      )
      
      diagrams.push({
        id: conceptDiagram.id,
        type: 'mindmap' as const,
        title: 'Key Concepts',
        description: 'Overview of main ideas',
        asciiArt: conceptDiagram.asciiArt,
        mermaidCode: conceptDiagram.mermaidCode
      })
    }
    
  } catch (error) {
    console.error('Error generating diagrams:', error)
    
    // Fallback diagram
    diagrams.push({
      id: 'fallback_concept',
      type: 'diagram' as const,
      title: 'Study Overview',
      description: 'Key learning concepts',
      asciiArt: `
    ${title}
    ┌─────────────────┐
    │   Key Concepts  │
    │                 │
    │ • Main Ideas    │
    │ • Examples      │
    │ • Applications  │
    └─────────────────┘`
    })
  }
  
  return diagrams
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    const aiServiceManager = AIServiceManager.getInstance()

    const videoResponse = await youtube.videos.list({
      part: ['snippet'],
      id: [videoId],
    })

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    const video = videoResponse.data.items[0]
    const title = video.snippet?.title || ''
    const description = video.snippet?.description || ''

    // Generate basic notes
    const notes = await aiServiceManager.generateNotes(title, description)
    
    // Infer subject and generate diagrams
    const subject = inferSubject(title)
    const diagrams = await generateNoteDiagrams(title, description, subject)
    
    // Add visual elements for study aid
    const visualElements = [
      {
        type: 'highlight' as const,
        content: 'Key definitions and important terms',
        position: 'throughout'
      },
      {
        type: 'star' as const,
        content: 'Critical concepts for understanding',
        position: 'main_points'
      },
      {
        type: 'box' as const,
        content: 'Examples and practical applications',
        position: 'examples'
      }
    ]

    // Enhanced notes response
    const enhancedNotes = {
      ...notes,
      diagrams,
      visualElements,
      subject,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(enhancedNotes)
  } catch (error) {
    console.error('AI notes error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate notes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
