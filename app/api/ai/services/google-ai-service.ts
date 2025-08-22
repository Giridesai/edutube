import { ApiNotes, ApiQuiz } from '@/lib/types'
import { AIAnalysis } from './types'
import { getGoogleApiKey } from '@/lib/utils/api-keys'

export interface AIService {
  generateVideoSummary(title: string, description: string): Promise<AIAnalysis>
  generateQuiz(title: string, description: string): Promise<ApiQuiz>
  generateNotes(title: string, description: string): Promise<ApiNotes>
  testConnection(): Promise<boolean>
}

// Minimal Google AI service that uses Generative Language API / Vertex endpoints.
export class GoogleAIService implements AIService {
  private apiKey?: string
  private apiUrl?: string
  private model: string

  constructor() {
    this.apiKey = getGoogleApiKey()
    this.apiUrl = process.env.GOOGLE_AI_API_URL
    this.model = process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash'
  }

  private buildUrl(): string {
    // Prefer a configured apiUrl, else use Generative Language API endpoint
    if (this.apiUrl) return this.apiUrl
    
    // Ensure model name has the 'models/' prefix
    const modelName = this.model.startsWith('models/') ? this.model : `models/${this.model}`
    
    // Use different API endpoints based on model type
    if (this.model.startsWith('gemini')) {
      // Use v1beta for Gemini models
      return `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`
    } else {
      // Use v1beta2 for older models like chat-bison
      return `https://generativelanguage.googleapis.com/v1beta2/${modelName}:generateText`
    }
  }

  async generateVideoSummary(title: string, description: string): Promise<AIAnalysis> {
    const prompt = `You are NotebookLM. Analyze the following educational video and return a JSON object with keys: summary (a detailed paragraph of 10-15 sentences), keyPoints (array of 3-6 bullet points), difficulty (beginner|intermediate|advanced), subject (short label). Provide only valid JSON.`

    const inputText = `Video Title: ${title}\n\nVideo Description: ${description.substring(0, 4000)}`

    const url = this.buildUrl()
    
    // Different request formats for different model types
    let body: any
    if (this.model.startsWith('gemini')) {
      // Gemini models use the v1beta generateContent endpoint
      body = {
        contents: [{
          parts: [{
            text: `${prompt}\n\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      }
    } else {
      // Older models use the v1beta2 generateText endpoint
      body = {
        prompt: `${prompt}\n\n${inputText}`,
        temperature: 0.3,
        max_output_tokens: 500,
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Add API key to URL query parameters
    let finalUrl = url
    if (this.apiKey) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}key=${this.apiKey}`
    }

    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Google AI generate error', res.status, res.statusText, text)
        
        // Handle specific error types
        if (res.status === 429) {
          console.warn('Google AI API quota exceeded - using fallback response')
          // Don't throw error, just continue to fallback
        } else {
          throw new Error('Google AI generate failed')
        }
      } else {
        const data = await res.json().catch(async () => {
          const raw = await res.text().catch(() => '')
          throw new Error(`Invalid JSON from Google AI: ${raw}`)
        })

        // Extract text from different response formats
        let aiText: string | undefined
        
        if (this.model.startsWith('gemini')) {
          // Gemini models return candidates with content.parts
          if (Array.isArray(data?.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
            aiText = data.candidates[0].content.parts[0].text
          }
        } else {
          // Older models return different format
          if (Array.isArray(data?.candidates) && data.candidates[0]?.content) {
            aiText = data.candidates[0].content
          } else if (data?.output?.[0]?.content) {
            const out = data.output[0].content
            if (typeof out === 'string') aiText = out
            else if (Array.isArray(out)) aiText = out.map((p: any) => p.text || p.content || JSON.stringify(p)).join('\n')
          } else if (typeof data?.text === 'string') {
            aiText = data.text
          }
        }

        if (aiText) {
          // Try to parse JSON in the model output
          let analysis: AIAnalysis | undefined
          try {
            analysis = JSON.parse(aiText)
          } catch (e) {
            const match = aiText.match(/\{[\s\S]*\}/)
            if (match) {
              try { analysis = JSON.parse(match[0]) } catch (e2) { /* fall through */ }
            }
          }

          if (analysis && analysis.summary && Array.isArray(analysis.keyPoints)) {
            return analysis
          }
        }
      }
    } catch (err) {
      console.error('GoogleAIService network error:', err)
    }
    
    // Fallback analysis if AI failed or quota exceeded
    console.log('Using fallback analysis generation')
    
    // Provide a more informative fallback based on the title and description
    const videoContent = title.toLowerCase()
    let subject = 'general'
    let difficulty = 'intermediate'
    
    // Try to infer subject from title
    if (videoContent.includes('math') || videoContent.includes('calculus') || videoContent.includes('algebra')) {
      subject = 'mathematics'
    } else if (videoContent.includes('programming') || videoContent.includes('code') || videoContent.includes('javascript') || videoContent.includes('python')) {
      subject = 'programming'
    } else if (videoContent.includes('science') || videoContent.includes('physics') || videoContent.includes('chemistry') || videoContent.includes('biology')) {
      subject = 'science'
    } else if (videoContent.includes('history') || videoContent.includes('war') || videoContent.includes('ancient')) {
      subject = 'history'
    } else if (videoContent.includes('language') || videoContent.includes('english') || videoContent.includes('grammar')) {
      subject = 'language'
    }
    
    // Try to infer difficulty
    if (videoContent.includes('beginner') || videoContent.includes('intro') || videoContent.includes('basic')) {
      difficulty = 'beginner'
    } else if (videoContent.includes('advanced') || videoContent.includes('expert') || videoContent.includes('master')) {
      difficulty = 'advanced'
    }
    
    return {
      summary: `This educational video covers important concepts in ${subject}. The content provides structured learning material with clear explanations and practical examples. This resource is valuable for students looking to understand key concepts and build foundational knowledge in the subject area.`,
      keyPoints: [
        'Educational content with structured presentation',
        'Clear explanations of key concepts', 
        'Practical examples and applications',
        'Suitable for self-paced learning',
        'Builds foundational knowledge in the topic area'
      ],
      difficulty,
      subject
    }
  }

  async generateEnhancedQuiz(context: any): Promise<ApiQuiz> {
    const prompt = `You are NotebookLM. Using the detailed context below, generate a comprehensive 10-question multiple-choice quiz that tests understanding of the specific video content. Make questions specific to the actual content, not generic educational questions.

    Video Context:
    Title: ${context.title}
    Subject: ${context.subject}
    Difficulty Level: ${context.difficulty}
    Video Summary: ${context.summary || 'Not available'}
    Key Points: ${context.keyPoints?.join(', ') || 'Not available'}
    Description: ${context.description?.substring(0, 2000) || 'Not available'}

    Generate questions that:
    1. Test specific concepts mentioned in the video
    2. Are appropriate for the ${context.difficulty} difficulty level
    3. Cover different aspects of the ${context.subject} topic
    4. Include practical applications when relevant

    Return a JSON object with a "questions" array. Each question object should have:
    - "question": specific question about the video content
    - "options": an array of 4 plausible option strings
    - "correct": the index (0-3) of the correct option
    - "explanation": detailed explanation referencing the video content
    
    Provide only valid JSON.`

    const url = this.buildUrl()
    
    let body: any
    if (this.model.startsWith('gemini')) {
      body = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2, // Lower temperature for more focused questions
          maxOutputTokens: 1500,
        }
      }
    } else {
      body = {
        prompt: prompt,
        temperature: 0.2,
        max_output_tokens: 1500,
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    let finalUrl = url
    if (this.apiKey) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}key=${this.apiKey}`
    }

    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Google AI enhanced quiz error', res.status, res.statusText, text)
        throw new Error('Google AI enhanced quiz failed')
      }

      const data = await res.json()
      let aiText: string | undefined
      
      if (this.model.startsWith('gemini')) {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiText = data.candidates[0].content.parts[0].text
        }
      } else {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content) {
          aiText = data.candidates[0].content
        }
      }

      if (!aiText) {
        throw new Error('No content from Google AI for enhanced quiz')
      }

      let quiz: ApiQuiz | undefined
      try {
        quiz = JSON.parse(aiText)
      } catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/)
        if (match) {
          try { quiz = JSON.parse(match[0]) } catch (e2) { /* fall through */ }
        }
      }

      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('Invalid enhanced quiz format from Google AI')
      }

      // Validate and enhance quiz format
      quiz.questions = quiz.questions.slice(0, 8).map((q, index) => ({
        question: q.question || `Question ${index + 1} about ${context.subject}`,
        options: Array.isArray(q.options) && q.options.length >= 4 
          ? q.options.slice(0, 4) 
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4 ? q.correct : 0,
        explanation: q.explanation || 'This relates to the key concepts covered in the video.'
      }))

      return {
        questions: quiz.questions
      }
    } catch (err) {
      console.error('GoogleAIService generateEnhancedQuiz error:', err)
      throw err // Re-throw to allow fallback handling
    }
  }

  async generateQuiz(title: string, description: string): Promise<ApiQuiz> {
    const prompt = `You are NotebookLM. Analyze the following educational video and generate a 10-question multiple-choice quiz. Return a JSON object with a "questions" array. Each question object should have:
    - "question": the question text
    - "options": an array of 4 option strings  
    - "correct": the index (0-3) of the correct option
    - "explanation": explanation of why the answer is correct
    
    Provide only valid JSON.`

    const inputText = `Video Title: ${title}\n\nVideo Description: ${description.substring(0, 4000)}`

    const url = this.buildUrl()
    
    let body: any
    if (this.model.startsWith('gemini')) {
      body = {
        contents: [{
          parts: [{
            text: `${prompt}\n\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
        }
      }
    } else {
      body = {
        prompt: `${prompt}\n\n${inputText}`,
        temperature: 0.3,
        max_output_tokens: 1000,
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    let finalUrl = url
    if (this.apiKey) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}key=${this.apiKey}`
    }

    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Google AI generate quiz error', res.status, res.statusText, text)
        throw new Error('Google AI generate quiz failed')
      }

      const data = await res.json()
      let aiText: string | undefined
      
      if (this.model.startsWith('gemini')) {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiText = data.candidates[0].content.parts[0].text
        }
      } else {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content) {
          aiText = data.candidates[0].content
        }
      }

      if (!aiText) {
        throw new Error('No content from Google AI for quiz')
      }

      let quiz: ApiQuiz | undefined
      try {
        quiz = JSON.parse(aiText)
      } catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/)
        if (match) {
          try { quiz = JSON.parse(match[0]) } catch (e2) { /* fall through */ }
        }
      }

      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('Invalid quiz format from Google AI')
      }

      // Validate and fix quiz format
      quiz.questions = quiz.questions.map(q => ({
        question: q.question || 'Sample question',
        options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: typeof q.correct === 'number' ? q.correct : 0,
        explanation: q.explanation || 'No explanation provided'
      }))

      return quiz
    } catch (err) {
      console.error('GoogleAIService generateQuiz error:', err)
      return { questions: [] }
    }
  }

  async generateNotes(title: string, description: string): Promise<ApiNotes> {
    const prompt = `You are NotebookLM. Analyze the following educational video and generate detailed study notes. Return a JSON object with the following structure:
    {
      "title": "Clear, descriptive title for the notes",
      "content": "Detailed notes content with key concepts, explanations, and important information formatted as markdown",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
    
    Make the content comprehensive and well-structured for study purposes. Provide only valid JSON.`

    const inputText = `Video Title: ${title}\n\nVideo Description: ${description.substring(0, 4000)}`

    const url = this.buildUrl()
    
    let body: any
    if (this.model.startsWith('gemini')) {
      body = {
        contents: [{
          parts: [{
            text: `${prompt}\n\n${inputText}`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }
    } else {
      body = {
        prompt: `${prompt}\n\n${inputText}`,
        temperature: 0.3,
        max_output_tokens: 2000,
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    let finalUrl = url
    if (this.apiKey) {
      const separator = url.includes('?') ? '&' : '?'
      finalUrl = `${url}${separator}key=${this.apiKey}`
    }

    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error('Google AI generate notes error', res.status, res.statusText, text)
        throw new Error('Google AI generate notes failed')
      }

      const data = await res.json()
      let aiText: string | undefined
      
      if (this.model.startsWith('gemini')) {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content?.parts?.[0]?.text) {
          aiText = data.candidates[0].content.parts[0].text
        }
      } else {
        if (Array.isArray(data?.candidates) && data.candidates[0]?.content) {
          aiText = data.candidates[0].content
        }
      }

      if (!aiText) {
        throw new Error('No content from Google AI for notes')
      }

      let notes: ApiNotes | undefined
      try {
        notes = JSON.parse(aiText)
      } catch (e) {
        const match = aiText.match(/\{[\s\S]*\}/)
        if (match) {
          try { 
            notes = JSON.parse(match[0])
          } catch (e2) { /* fall through */ }
        }
      }

      // Validate the structure
      if (!notes || !notes.title || !notes.content || !Array.isArray(notes.keyPoints)) {
        // Create fallback structured notes
        notes = {
          title: title || 'Study Notes',
          content: aiText || 'Detailed study notes covering the key concepts and important information from this educational video.',
          keyPoints: [
            'Key concepts and definitions',
            'Important examples and applications',
            'Main takeaways for understanding'
          ]
        }
      }

      return notes
    } catch (err) {
      console.error('GoogleAIService generateNotes error:', err)
      return {
        title: title || 'Study Notes',
        content: 'Error generating notes. Please try again.',
        keyPoints: ['Unable to generate key points at this time']
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Use a simple models list endpoint to test connection
      const testUrl = this.apiKey 
        ? `https://generativelanguage.googleapis.com/v1beta/models?key=${getGoogleApiKey()}`
        : 'https://generativelanguage.googleapis.com/v1beta/models'
      
      const res = await fetch(testUrl, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return res.ok
    } catch (err) {
      console.error('GoogleAIService testConnection error:', err)
      return false
    }
  }
}

export const googleAIService = new GoogleAIService()
