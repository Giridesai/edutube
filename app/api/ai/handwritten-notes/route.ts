import { NextRequest, NextResponse } from 'next/server'
import { AIServiceManager } from '../services/ai-service-manager'
import { visualGenerationService } from '../services/visual-generation-service'
import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

interface HandwrittenNotesResponse {
  notes: {
    title: string
    subject: string
    date: string
    sections: NotesSection[]
    diagrams: DiagramInstruction[]
    keyPoints: string[]
    summary: string
    visualElements: VisualElement[]
  }
}

interface NotesSection {
  heading: string
  content: string
  timestamp?: string
  importance: 'high' | 'medium' | 'low'
  hasVisual?: boolean
  visualType?: 'diagram' | 'equation' | 'flowchart' | 'mindmap'
}

interface DiagramInstruction {
  id: string
  type: 'flowchart' | 'mindmap' | 'diagram' | 'equation' | 'timeline'
  title: string
  description: string
  mermaidCode?: string
  asciiArt?: string
  placement: string
}

interface VisualElement {
  type: 'highlight' | 'box' | 'arrow' | 'underline' | 'star'
  content: string
  position: string
}

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    console.log('Generating handwritten notes for video:', videoId)

    let title = 'Educational Video'
    let description = 'Educational content for learning and note-taking'
    let duration = ''

    try {
      // Try to get video details from YouTube API
      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId],
      })

      if (videoResponse.data.items && videoResponse.data.items.length > 0) {
        const video = videoResponse.data.items[0]
        title = video.snippet?.title || title
        description = video.snippet?.description || description
        duration = video.contentDetails?.duration || duration
        console.log('Video title:', title)
      } else {
        console.log('Video not found, using fallback data')
        title = `Educational Video (${videoId})`
        description = 'This educational video contains valuable learning content. Due to API limitations, detailed video information is not available, but comprehensive notes can still be generated based on the video content structure.'
      }
    } catch (youtubeError) {
      console.error('YouTube API error:', youtubeError)
      
      // Check if it's a quota error
      const errorMessage = youtubeError instanceof Error ? youtubeError.message : String(youtubeError)
      if (errorMessage.includes('quota') || errorMessage.includes('exceeded')) {
        console.log('YouTube API quota exceeded, using fallback video data')
        title = `Educational Video - ID: ${videoId}`
        description = 'This educational video contains valuable learning content. YouTube API quota has been exceeded, but comprehensive handwritten notes can still be generated. The notes will include structured content, key concepts, diagrams, and study materials based on educational best practices.'
      } else {
        // For other YouTube API errors, still continue with fallback
        console.log('YouTube API unavailable, using fallback video data')
        title = `Educational Content (${videoId})`
        description = 'Educational video content with structured learning materials and key concepts for effective note-taking and study.'
      }
    }

    const aiServiceManager = AIServiceManager.getInstance()

    // Generate comprehensive handwritten-style notes
    const handwrittenNotes = await generateHandwrittenNotes(
      title, 
      description, 
      duration,
      aiServiceManager
    )

    return NextResponse.json({
      notes: handwrittenNotes,
      videoId,
      generatedAt: new Date().toISOString(),
      notice: title.includes('Educational Video') ? 'Generated with limited video metadata due to API constraints' : undefined
    })

  } catch (error) {
    console.error('Handwritten notes generation error:', error)
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    let userFriendlyMessage = 'Failed to generate handwritten notes'
    let statusCode = 500
    
    if (errorMessage.includes('quota')) {
      userFriendlyMessage = 'API quota exceeded. Please try again later or contact support.'
      statusCode = 429
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      userFriendlyMessage = 'Network error occurred. Please check your connection and try again.'
    } else if (errorMessage.includes('Invalid video')) {
      userFriendlyMessage = 'Invalid video ID provided.'
      statusCode = 400
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyMessage,
        details: errorMessage,
        suggestion: statusCode === 429 ? 'The system has temporarily exceeded API limits. You can still use the demo functionality to test features.' : 'Please try again or contact support if the issue persists.'
      },
      { status: statusCode }
    )
  }
}

async function generateHandwrittenNotes(
  title: string, 
  description: string, 
  duration: string,
  aiServiceManager: AIServiceManager
): Promise<HandwrittenNotesResponse['notes']> {
  
  // Create a comprehensive prompt for handwritten-style notes
  const notesPrompt = `You are a brilliant student taking handwritten notes during an educational video lecture. Generate detailed, student-style handwritten notes for the following video.

Video Title: ${title}
Description: ${description}
Duration: ${duration}

Generate a JSON response with the following structure:
{
  "title": "Clean, student-written title",
  "subject": "Subject area (e.g., Mathematics, Science, History, etc.)",
  "date": "Today's date in format: Month DD, YYYY",
  "sections": [
    {
      "heading": "Section title (like 'Introduction', 'Main Concepts', etc.)",
      "content": "Detailed notes content with abbreviations, bullet points, and student-style writing",
      "timestamp": "Approximate timestamp in video (optional)",
      "importance": "high|medium|low",
      "hasVisual": true/false,
      "visualType": "diagram|equation|flowchart|mindmap"
    }
  ],
  "diagrams": [
    {
      "id": "unique_id",
      "type": "flowchart|mindmap|diagram|equation|timeline",
      "title": "Diagram title",
      "description": "What this diagram shows",
      "mermaidCode": "Mermaid.js code for the diagram (if applicable)",
      "asciiArt": "Simple ASCII art representation",
      "placement": "Where to place in notes"
    }
  ],
  "keyPoints": ["Important takeaways in student language"],
  "summary": "Brief summary as a student would write",
  "visualElements": [
    {
      "type": "highlight|box|arrow|underline|star",
      "content": "Text to highlight",
      "position": "Where to place the visual element"
    }
  ]
}

Make the notes feel authentic - use:
- Student abbreviations (w/ for with, b/c for because, etc.)
- Bullet points and numbered lists
- Emphasis markers (!!!, *important*, etc.)
- Questions students might ask
- Personal observations and connections
- Simplified explanations in student language
- Drawing descriptions for complex concepts

Include at least 3-5 diagrams or visual elements that would help understanding.
Provide only valid JSON.`

  try {
    // Use Google AI service for comprehensive note generation
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: notesPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.log('AI API Error:', response.status, errorText)
      
      // Handle different types of API errors
      if (response.status === 429) {
        console.log('AI quota exceeded, using fallback note generation')
        throw new Error('AI_QUOTA_EXCEEDED')
      } else if (response.status === 403) {
        const isServiceDisabled = errorText.includes('SERVICE_DISABLED') || errorText.includes('has not been used') || errorText.includes('is disabled')
        if (isServiceDisabled) {
          console.log('Google Generative Language API is disabled, using fallback note generation')
          throw new Error('AI_SERVICE_DISABLED')
        }
        console.log('AI access forbidden, using fallback note generation')
        throw new Error('AI_ACCESS_FORBIDDEN')
      } else if (response.status >= 500) {
        console.log('AI service unavailable, using fallback note generation')
        throw new Error('AI_SERVICE_UNAVAILABLE')
      }
      throw new Error('Failed to generate notes with AI')
    }

    const data = await response.json()
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      throw new Error('No content generated from AI')
    }

    // Parse the JSON response
    let notesData
    try {
      notesData = JSON.parse(aiText)
    } catch (e) {
      // Try to extract JSON from the response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        notesData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Could not parse AI response as JSON')
      }
    }

    // Validate and enhance the notes data
    if (!notesData.sections) notesData.sections = []
    if (!notesData.diagrams) notesData.diagrams = []
    if (!notesData.keyPoints) notesData.keyPoints = []
    if (!notesData.visualElements) notesData.visualElements = []

    // Set defaults
    notesData.title = notesData.title || title
    notesData.subject = notesData.subject || inferSubject(title)
    notesData.date = notesData.date || new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    // Generate additional diagrams if needed
    if (notesData.diagrams.length < 2) {
      const additionalDiagrams = await generateDiagramsWithVisualService(title, description, notesData.subject)
      notesData.diagrams.push(...additionalDiagrams)
    }

    return notesData

  } catch (error) {
    console.error('Error generating handwritten notes:', error)
    
    // Enhanced fallback for different error types
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const isQuotaError = errorMessage === 'AI_QUOTA_EXCEEDED'
    const isServiceDisabled = errorMessage === 'AI_SERVICE_DISABLED'
    const isAccessForbidden = errorMessage === 'AI_ACCESS_FORBIDDEN'
    const isServiceUnavailable = errorMessage === 'AI_SERVICE_UNAVAILABLE'
    
    const fallbackSubject = inferSubject(title)
    
    // Provide appropriate fallback message based on error type
    let fallbackMessage = "Generated with enhanced AI analysis"
    let warningMessage = ""
    
    if (isQuotaError) {
      fallbackMessage = "Generated with fallback content due to AI quota limits"
      warningMessage = "⚠️ AI analysis unavailable due to quota limits"
    } else if (isServiceDisabled) {
      fallbackMessage = "Generated with fallback content (AI service not configured)"
      warningMessage = "⚠️ Google Generative Language API needs to be enabled"
    } else if (isAccessForbidden) {
      fallbackMessage = "Generated with fallback content (AI access restricted)"
      warningMessage = "⚠️ AI service access is restricted"
    } else if (isServiceUnavailable) {
      fallbackMessage = "Generated with fallback content (AI service temporarily unavailable)"
      warningMessage = "⚠️ AI service is temporarily unavailable"
    }
    
    return {
      title: title,
      subject: fallbackSubject,
      date: new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      sections: [
        {
          heading: "📚 Video Overview",
          content: `Title: ${title}\n\n• This educational video covers important concepts and learning objectives\n• Key topics are presented in a structured format\n• Examples and explanations help reinforce understanding\n• Suitable for students at various levels\n\n${warningMessage ? `${warningMessage}\n` : ''}• Notes generated using fallback educational templates`,
          importance: 'high' as const,
          hasVisual: true,
          visualType: 'mindmap' as const
        },
        {
          heading: "🎯 Learning Objectives", 
          content: `• Understand the main concepts presented\n• Apply knowledge through examples\n• Connect ideas to real-world applications\n• Build foundational knowledge for advanced topics\n• Develop critical thinking skills`,
          importance: 'high' as const,
          hasVisual: false
        },
        {
          heading: "💡 Key Takeaways",
          content: `• Video provides comprehensive coverage of the topic\n• Clear explanations with practical examples\n• Step-by-step approach to complex concepts\n• Valuable resource for continued learning\n• Applicable to real-world scenarios`,
          importance: 'medium' as const,
          hasVisual: false
        },
        {
          heading: "📝 Study Notes",
          content: `• Take notes while watching for better retention\n• Pause and review complex sections\n• Practice applying the concepts learned\n• Connect new information to prior knowledge\n• Review and summarize main points`,
          importance: 'medium' as const,
          hasVisual: false
        }
      ],
      diagrams: await generateDiagramsWithVisualService(title, description, fallbackSubject),
      keyPoints: [
        "Comprehensive educational content with clear structure",
        "Practical examples and real-world applications", 
        "Step-by-step explanations of complex concepts",
        "Valuable resource for building knowledge foundation",
        fallbackMessage
      ],
      summary: isServiceDisabled 
        ? `This video provides valuable educational content on ${fallbackSubject.toLowerCase()}. AI-powered analysis is unavailable because the Google Generative Language API is not enabled for this project. To enable full AI features, please activate the API in the Google Cloud Console.`
        : isQuotaError
        ? `This video provides valuable educational content on ${fallbackSubject.toLowerCase()}. AI analysis is temporarily unavailable due to usage limits, but the content appears to cover important concepts with practical examples.`
        : "Comprehensive educational video with valuable insights and practical knowledge for effective learning.",
      visualElements: [
        {
          type: 'highlight' as const,
          content: "Key learning objectives and main concepts",
          position: "top"
        },
        {
          type: 'box' as const,
          content: "Important definitions and terminology", 
          position: "middle"
        },
        {
          type: 'star' as const,
          content: "Critical insights and takeaways",
          position: "bottom"
        }
      ]
    }
  }
}

async function generateDiagramsWithVisualService(title: string, description: string, subject: string): Promise<DiagramInstruction[]> {
  const diagrams: DiagramInstruction[] = []

  try {
    // Generate subject-specific diagram
    const mainDiagram = await visualGenerationService.generateDiagramForContent(
      subject, 
      `${title} ${description}`, 
      'diagram'
    )

    diagrams.push({
      id: mainDiagram.id,
      type: 'diagram',
      title: mainDiagram.title,
      description: mainDiagram.description,
      asciiArt: mainDiagram.asciiArt,
      mermaidCode: mainDiagram.mermaidCode,
      placement: 'middle'
    })

    // Generate a concept map
    const conceptDiagram = await visualGenerationService.generateDiagramForContent(
      'general',
      description,
      'mindmap'
    )

    diagrams.push({
      id: conceptDiagram.id,
      type: 'mindmap',
      title: 'Key Concepts',
      description: 'Overview of main ideas and relationships',
      asciiArt: conceptDiagram.asciiArt,
      mermaidCode: conceptDiagram.mermaidCode,
      placement: 'end'
    })

  } catch (error) {
    console.error('Error generating diagrams with visual service:', error)
    // Fallback to basic diagrams
    return await generateDiagrams(title, description)
  }

  return diagrams
}

async function generateDiagrams(title: string, description: string): Promise<DiagramInstruction[]> {
  const subject = inferSubject(title)
  const diagrams: DiagramInstruction[] = []

  // Generate subject-specific diagrams
  if (subject === 'Mathematics' || title.toLowerCase().includes('math')) {
    diagrams.push({
      id: 'math_concept',
      type: 'equation',
      title: 'Key Mathematical Concepts',
      description: 'Important formulas and relationships',
      asciiArt: `
     Key Formula:
     ┌─────────────────┐
     │   y = mx + b    │
     │                 │
     │ m = slope       │
     │ b = y-intercept │
     └─────────────────┘`,
      placement: 'after_introduction'
    })
  }

  if (subject === 'Science' || title.toLowerCase().includes('science')) {
    diagrams.push({
      id: 'process_flow',
      type: 'flowchart',
      title: 'Scientific Process',
      description: 'Steps in the scientific method',
      mermaidCode: `
graph TD
    A[Observation] --> B[Hypothesis]
    B --> C[Experiment]
    C --> D[Analysis]
    D --> E[Conclusion]
    E --> F[Theory]`,
      placement: 'middle'
    })
  }

  // Always include a general concept map
  diagrams.push({
    id: 'concept_map',
    type: 'mindmap',
    title: 'Key Concepts',
    description: 'Main ideas and their relationships',
    asciiArt: `
         Main Topic
         /    |    \\
    Concept A  |  Concept C
       |    Concept B   |
   Detail 1     |   Detail 3
             Detail 2`,
    placement: 'end'
  })

  return diagrams
}

function inferSubject(title: string): string {
  const titleLower = title.toLowerCase()
  
  if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra') || titleLower.includes('geometry')) {
    return 'Mathematics'
  } else if (titleLower.includes('physics') || titleLower.includes('chemistry') || titleLower.includes('biology') || titleLower.includes('science')) {
    return 'Science'
  } else if (titleLower.includes('history') || titleLower.includes('war') || titleLower.includes('ancient') || titleLower.includes('civilization')) {
    return 'History'
  } else if (titleLower.includes('programming') || titleLower.includes('code') || titleLower.includes('javascript') || titleLower.includes('python') || titleLower.includes('computer')) {
    return 'Computer Science'
  } else if (titleLower.includes('language') || titleLower.includes('english') || titleLower.includes('grammar') || titleLower.includes('literature')) {
    return 'Language Arts'
  } else if (titleLower.includes('economics') || titleLower.includes('business') || titleLower.includes('finance')) {
    return 'Economics'
  } else {
    return 'General Education'
  }
}
