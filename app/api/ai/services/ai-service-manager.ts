import { ChatGPTOSSService } from './chatgpt-oss-service'
import { GoogleAIService } from './google-ai-service'
import { ApiNotes, ApiQuiz } from '@/lib/types'
import { AIAnalysis } from './types'

export interface AIService {
  generateVideoSummary(title: string, description: string): Promise<AIAnalysis>
  generateQuiz(title: string, description: string): Promise<ApiQuiz>
  generateEnhancedQuiz?(context: any): Promise<ApiQuiz>
  generateNotes(title: string, description: string): Promise<ApiNotes>
  testConnection(): Promise<boolean>
}

// AI Service Factory
export class AIServiceManager {
  private static instance: AIServiceManager
  private currentService!: AIService

  private constructor() {
    this.initializeService()
  }

  private initializeService() {
    // Prefer Google AI (NotebookLM / Gemini) if configured, else fallback to ChatGPT OSS
    const hasGoogleAI = !!(process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_URL)
    const hasChatGPTOSS = !!(process.env.CHATGPT_OSS_API_URL || process.env.CHATGPT_OSS_MODEL)
    
    if (hasGoogleAI) {
      this.currentService = new GoogleAIService()
    } else if (hasChatGPTOSS) {
      this.currentService = new ChatGPTOSSService()
    } else {
      // Use ChatGPT OSS as default fallback
      this.currentService = new ChatGPTOSSService()
    }
  }

  public static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager()
    }
    return AIServiceManager.instance
  }

  public static resetInstance(): void {
    AIServiceManager.instance = new AIServiceManager()
  }

  public getCurrentService(): AIService {
    return this.currentService
  }

  public async switchToOSS(): Promise<void> {
    this.currentService = new ChatGPTOSSService()
  }

  public async switchToGoogle(): Promise<void> {
    this.currentService = new GoogleAIService()
  }

  public async generateVideoSummary(title: string, description: string): Promise<AIAnalysis> {
    return await this.currentService.generateVideoSummary(title, description)
  }

  public async generateQuiz(title: string, description: string): Promise<ApiQuiz> {
    return await this.currentService.generateQuiz(title, description)
  }

  public async generateEnhancedQuiz(context: any): Promise<ApiQuiz> {
    if (this.currentService.generateEnhancedQuiz) {
      return await this.currentService.generateEnhancedQuiz(context)
    }
    // Fallback to regular quiz generation with enhanced context
    const contextString = `Title: ${context.title}\nDescription: ${context.description}\nSummary: ${context.summary}\nKey Points: ${context.keyPoints?.join(', ')}\nSubject: ${context.subject}\nDifficulty: ${context.difficulty}`
    return await this.currentService.generateQuiz(context.title, contextString)
  }

  public async generateNotes(title: string, description: string): Promise<ApiNotes> {
    return await this.currentService.generateNotes(title, description)
  }

  public async testConnection(): Promise<boolean> {
    return await this.currentService.testConnection()
  }

  public getServiceName(): string {
    if (this.currentService.constructor.name === 'GoogleAIService') return 'Google NotebookLM (Gemini)'
    if (this.currentService.constructor.name === 'ChatGPTOSSService') return 'ChatGPT OSS (local)'
    return 'Unknown Service'
  }
}

// Export singleton instance
export const aiServiceManager = AIServiceManager.getInstance()
