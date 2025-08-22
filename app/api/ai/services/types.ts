// AI-specific types
export interface AIAnalysis {
  summary: string
  keyPoints: string[]
  difficulty: string
  subject: string
}

export interface ChatGPTOSSResponse extends AIAnalysis {}

// Re-export common types from lib for convenience
export type { 
  QuizQuestion, 
  ApiQuiz, 
  ApiNotes, 
  VideoSummaryResponse 
} from '@/lib/types'
