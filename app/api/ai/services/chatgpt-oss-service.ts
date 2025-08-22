import { ApiNotes, ApiQuiz } from '@/lib/types'
import { ChatGPTOSSResponse, AIAnalysis } from './types'

export class ChatGPTOSSService {
  private apiUrl: string
  private apiKey?: string
  private model: string

  constructor() {
    // Default to local Ollama instance, can be configured via environment
    this.apiUrl = process.env.CHATGPT_OSS_API_URL || 'http://localhost:11434/v1/chat/completions'
    this.apiKey = process.env.CHATGPT_OSS_API_KEY // Optional for local instances
    this.model = process.env.CHATGPT_OSS_MODEL || 'chatgpt-oss-120b'
  }

  async generateVideoSummary(title: string, description: string): Promise<ChatGPTOSSResponse> {
    const prompt = `
    Analyze this educational video and provide:
    1. A concise summary (2-3 sentences)
    2. Key learning points (3-5 bullet points)
    3. Difficulty level (beginner, intermediate, advanced)
    4. Subject category (math, science, history, programming, etc.)

    Video Title: ${title}
    Video Description: ${description.substring(0, 1000)}...

    Respond in JSON format:
    {
      "summary": "...",
      "keyPoints": ["...", "...", "..."],
      "difficulty": "...",
      "subject": "..."
    }
    `

    const requestBody: any = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that analyzes educational video content and provides structured summaries. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: false
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add API key if available (for hosted instances)
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      // If not OK, capture body for debugging
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '<unable to read body>')
        console.error(`ChatGPT OSS API error: ${response.status} ${response.statusText} - ${bodyText}`)
        throw new Error(`ChatGPT OSS API error: ${response.status} ${response.statusText}`)
      }

      const rawText = await response.text()
      // Try to parse JSON safely; some runtimes return non-standard shapes
      let dataAny: any
      try {
        dataAny = JSON.parse(rawText)
      } catch (err) {
        // Not JSON — treat rawText as content
        dataAny = rawText
      }

      // Extract AI text content from known shapes
      let aiResponse: string | undefined
      if (typeof dataAny === 'string') {
        aiResponse = dataAny
      } else if (dataAny?.choices?.[0]?.message?.content) {
        aiResponse = dataAny.choices[0].message.content
      } else if (Array.isArray(dataAny?.output) && dataAny.output[0]?.content) {
        const out = dataAny.output[0].content
        if (Array.isArray(out)) {
          aiResponse = out.map((c: any) => c.text || c.content || JSON.stringify(c)).join('\n')
        } else if (typeof out === 'string') {
          aiResponse = out
        }
      } else if (dataAny?.result?.content) {
        aiResponse = dataAny.result.content
      }

      if (!aiResponse) {
        console.warn('No AI content found in ChatGPT OSS response, full response:', dataAny)
        throw new Error('No response content from ChatGPT OSS')
      }

      // Parse JSON block inside the aiResponse
      let analysis: ChatGPTOSSResponse | undefined
      try {
        analysis = JSON.parse(aiResponse)
      } catch (parseError) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { analysis = JSON.parse(jsonMatch[0]) } catch (e) { console.warn('Failed to parse JSON block from AI response:', e) }
        }
      }

      if (!analysis) {
        console.warn('Failed to parse ChatGPT OSS JSON response, using enhanced fallback')
        
        // Try to infer some context from the title
        const videoContent = title.toLowerCase()
        let subject = 'general'
        
        if (videoContent.includes('math') || videoContent.includes('calculus') || videoContent.includes('algebra')) {
          subject = 'mathematics'
        } else if (videoContent.includes('programming') || videoContent.includes('code')) {
          subject = 'programming'
        } else if (videoContent.includes('science') || videoContent.includes('physics') || videoContent.includes('chemistry')) {
          subject = 'science'
        }
        
        analysis = {
          summary: `This educational video covers important topics in ${subject} that can help you learn and understand key concepts.`,
          keyPoints: ["Educational content", "Learning material", "Key concepts explained"],
          difficulty: "intermediate",
          subject
        }
      }

      // Validate the response structure
      if (!analysis.summary || !Array.isArray(analysis.keyPoints)) {
        throw new Error('Invalid response structure from ChatGPT OSS')
      }

      return analysis
    } catch (error) {
      console.error('ChatGPT OSS service error:', error)

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

      // Return enhanced fallback response
      return {
        summary: `This educational video on ${subject} covers important concepts and learning objectives. The content provides valuable insights and practical knowledge for learners interested in this topic.`,
        keyPoints: [
          "Educational content covering key concepts",
          "Structured learning material", 
          "Practical examples and explanations",
          "Suitable for self-paced learning"
        ],
        difficulty,
        subject
      }
    }
  }

  async generateEnhancedQuiz(context: any): Promise<ApiQuiz> {
    const prompt = `
    Using the detailed context below, generate a comprehensive 10-question multiple-choice quiz that tests understanding of the specific video content. Make questions specific to the actual content, not generic educational questions.

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
    
    Respond in JSON format:
    {
      "questions": [
        {
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correct": 0,
          "explanation": "..."
        }
      ]
    }`

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      // Add auth header if API key is available
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`
      }

      const body = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Lower temperature for more focused questions
        max_tokens: 1500
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        console.error('ChatGPT OSS enhanced quiz error', response.status, response.statusText, text)
        throw new Error('ChatGPT OSS enhanced quiz failed')
      }

      const data = await response.json()
      
      // Extract the content from the response
      const content = data?.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in ChatGPT OSS enhanced quiz response')
      }

      // Parse the JSON response
      let quiz: ApiQuiz | undefined
      try {
        quiz = JSON.parse(content)
      } catch (e) {
        // Try to extract JSON from the response if it's wrapped in other text
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          try { quiz = JSON.parse(match[0]) } catch (e2) { /* fall through */ }
        }
      }

      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('Invalid enhanced quiz format from ChatGPT OSS')
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

    } catch (error) {
      console.error('ChatGPT OSS service generateEnhancedQuiz error:', error)
      throw error // Re-throw to allow fallback handling
    }
  }

  async generateQuiz(title: string, description: string): Promise<ApiQuiz> {
    const prompt = `
    Analyze this educational video and generate a 5-question multiple-choice quiz.
    Return a JSON object with a "questions" array. Each question object should have:
    - "question": the question text
    - "options": an array of 4 option strings
    - "correct": the index (0-3) of the correct option
    - "explanation": explanation of why the answer is correct

    Video Title: ${title}
    Video Description: ${description.substring(0, 1000)}...

    Respond in JSON format:
    {
      "questions": [
        {
          "question": "...",
          "options": ["...", "...", "...", "..."],
          "correct": 0,
          "explanation": "..."
        }
      ]
    }
    `

    const requestBody: any = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates quizzes from educational video content. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      stream: false
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '<unable to read body>')
        console.error(`ChatGPT OSS API error: ${response.status} ${response.statusText} - ${bodyText}`)
        throw new Error(`ChatGPT OSS API error: ${response.status} ${response.statusText}`)
      }

      const rawText = await response.text()
      let dataAny: any
      try {
        dataAny = JSON.parse(rawText)
      } catch (err) {
        dataAny = rawText
      }

      let aiResponse: string | undefined
      if (typeof dataAny === 'string') {
        aiResponse = dataAny
      } else if (dataAny?.choices?.[0]?.message?.content) {
        aiResponse = dataAny.choices[0].message.content
      }

      if (!aiResponse) {
        throw new Error('No response content from ChatGPT OSS for quiz')
      }

      let quiz: ApiQuiz | undefined
      try {
        quiz = JSON.parse(aiResponse)
      } catch (parseError) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { quiz = JSON.parse(jsonMatch[0]) } catch (e) { /* ignore */ }
        }
      }

      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('Invalid quiz format from ChatGPT OSS')
      }

      // Validate and fix quiz format
      quiz.questions = quiz.questions.map(q => ({
        question: q.question || 'Sample question',
        options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: typeof q.correct === 'number' ? q.correct : 0,
        explanation: q.explanation || 'No explanation provided'
      }))

      return quiz
    } catch (error) {
      console.error('ChatGPT OSS service generateQuiz error:', error)
      return { questions: [] }
    }
  }

  async generateNotes(title: string, description: string): Promise<ApiNotes> {
    const prompt = `
    Analyze this educational video and generate detailed study notes.
    
    Video Title: ${title}
    Video Description: ${description.substring(0, 1000)}...

    Return a JSON object with the following structure:
    {
      "title": "Clear, descriptive title for the notes",
      "content": "Detailed notes content with key concepts, explanations, and important information formatted as markdown",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }

    Make the content comprehensive and well-structured for study purposes.
    `

    const requestBody: any = {
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that generates detailed study notes from educational video content. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      stream: false
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '<unable to read body>')
        console.error(`ChatGPT OSS API error: ${response.status} ${response.statusText} - ${bodyText}`)
        throw new Error(`ChatGPT OSS API error: ${response.status} ${response.statusText}`)
      }

      const rawText = await response.text()
      let dataAny: any
      try {
        dataAny = JSON.parse(rawText)
      } catch (err) {
        dataAny = rawText
      }

      let aiResponse: string | undefined
      if (typeof dataAny === 'string') {
        aiResponse = dataAny
      } else if (dataAny?.choices?.[0]?.message?.content) {
        aiResponse = dataAny.choices[0].message.content
      }

      if (!aiResponse) {
        throw new Error('No response content from ChatGPT OSS for notes')
      }

      let notes: ApiNotes | undefined
      try {
        notes = JSON.parse(aiResponse)
      } catch (parseError) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try { 
            notes = JSON.parse(jsonMatch[0])
          } catch (e) { /* ignore */ }
        }
      }

      // Validate the structure
      if (!notes || !notes.title || !notes.content || !Array.isArray(notes.keyPoints)) {
        // Create fallback structured notes
        notes = {
          title: title || 'Study Notes',
          content: aiResponse || 'Detailed study notes covering the key concepts and important information from this educational video.',
          keyPoints: [
            'Key concepts and definitions',
            'Important examples and applications',
            'Main takeaways for understanding'
          ]
        }
      }

      return notes
    } catch (error) {
      console.error('ChatGPT OSS service generateNotes error:', error)
      return {
        title: title || 'Study Notes',
        content: 'Error generating notes. Please try again.',
        keyPoints: ['Unable to generate key points at this time']
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.apiUrl.replace('/chat/completions', '/models'), {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      })
      return response.ok
    } catch (error) {
      console.error('ChatGPT OSS connection test failed:', error)
      return false
    }
  }
}

export const chatgptOSSService = new ChatGPTOSSService()
