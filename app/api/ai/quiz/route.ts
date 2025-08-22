import { NextRequest, NextResponse } from 'next/server'
import { AIServiceManager } from '../services/ai-service-manager'
import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
})

// Generate enhanced AI-powered quiz based on video content
async function generateEnhancedAIQuiz(videoId: string, title: string, description: string) {
  try {
    // First, try to get video summary/analysis for better context
    let videoAnalysis = null
    try {
      const summaryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/api/ai/video-summary?videoId=${videoId}`)
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        videoAnalysis = summaryData
      }
    } catch (err) {
      console.log('Could not fetch video summary for quiz generation:', err)
    }

    // Use AI service with enhanced context
    const aiServiceManager = AIServiceManager.getInstance()
    
    // Create a rich context prompt for the AI
    const enhancedContext = {
      title,
      description: description.substring(0, 2000), // Limit description length
      summary: videoAnalysis?.summary || null,
      keyPoints: videoAnalysis?.keyPoints || [],
      subject: videoAnalysis?.subject || 'general',
      difficulty: videoAnalysis?.difficulty || 'intermediate'
    }

    // Generate quiz with enhanced context
    const quiz = await aiServiceManager.generateEnhancedQuiz(enhancedContext)
    
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      return quiz
    }
  } catch (error) {
    console.log('Enhanced AI quiz generation failed:', error)
  }
  
  return null
}

// Improved fallback quiz generator with better content analysis
function generateSmartFallbackQuiz(title: string, description: string) {
  const fullContent = `${title} ${description}`.toLowerCase()
  let subject = 'general'
  let questions = []
  let difficulty = 'intermediate'

  // Advanced subject detection
  const subjectKeywords = {
    javascript: ['javascript', 'js', 'react', 'node', 'vue', 'angular', 'typescript', 'npm', 'webpack'],
    python: ['python', 'django', 'flask', 'pandas', 'numpy', 'ml', 'machine learning', 'data science'],
    mathematics: ['math', 'calculus', 'algebra', 'geometry', 'statistics', 'equation', 'formula', 'derivative'],
    science: ['physics', 'chemistry', 'biology', 'quantum', 'molecule', 'atom', 'evolution', 'gravity'],
    programming: ['code', 'coding', 'programming', 'developer', 'software', 'algorithm', 'function', 'variable'],
    webdev: ['html', 'css', 'web development', 'frontend', 'backend', 'api', 'database', 'server'],
    business: ['business', 'marketing', 'startup', 'entrepreneur', 'finance', 'investment', 'strategy'],
    design: ['design', 'ui', 'ux', 'photoshop', 'illustrator', 'graphics', 'layout', 'typography']
  }

  // Detect subject based on keyword frequency
  let maxMatches = 0
  for (const [subj, keywords] of Object.entries(subjectKeywords)) {
    const matches = keywords.filter(keyword => fullContent.includes(keyword)).length
    if (matches > maxMatches) {
      maxMatches = matches
      subject = subj
    }
  }

  // Detect difficulty level
  if (fullContent.includes('beginner') || fullContent.includes('intro') || fullContent.includes('basics') || fullContent.includes('tutorial')) {
    difficulty = 'beginner'
  } else if (fullContent.includes('advanced') || fullContent.includes('expert') || fullContent.includes('masterclass') || fullContent.includes('deep dive')) {
    difficulty = 'advanced'
  }

  // Extract key concepts from description
  const concepts = extractKeyConcepts(description, subject)

  // Generate subject-specific questions based on content analysis
  switch (subject) {
    case 'javascript':
      questions = generateJavaScriptQuestions(concepts, difficulty)
      break
    case 'python':
      questions = generatePythonQuestions(concepts, difficulty)
      break
    case 'mathematics':
      questions = generateMathQuestions(concepts, difficulty)
      break
    case 'science':
      questions = generateScienceQuestions(concepts, difficulty)
      break
    case 'programming':
      questions = generateProgrammingQuestions(concepts, difficulty)
      break
    case 'webdev':
      questions = generateWebDevQuestions(concepts, difficulty)
      break
    case 'business':
      questions = generateBusinessQuestions(concepts, difficulty)
      break
    case 'design':
      questions = generateDesignQuestions(concepts, difficulty)
      break
    default:
      questions = generateGeneralEducationQuestions(title, concepts, difficulty)
  }

  return {
    questions: questions.length > 0 ? questions.slice(0, 5) : generateDefaultQuestions(title),
    metadata: {
      subject,
      difficulty,
      conceptsFound: concepts.length,
      generatedFrom: 'content_analysis'
    }
  }
}

// Extract key concepts from video description
type SubjectKey =
  | 'javascript'
  | 'python'
  | 'mathematics'
  | 'science'
  | 'programming'
  | 'webdev'
  | 'business'
  | 'design'

function extractKeyConcepts(description: string, subject: SubjectKey | string) {
  const concepts = []
  const words = description.toLowerCase().split(/\W+/)
  
  // Subject-specific important terms
  const importantTerms: Record<SubjectKey, string[]> = {
    javascript: ['function', 'variable', 'array', 'object', 'promise', 'async', 'await', 'callback', 'closure'],
    python: ['function', 'class', 'list', 'dictionary', 'loop', 'import', 'module', 'pandas', 'numpy'],
    mathematics: ['equation', 'formula', 'theorem', 'proof', 'derivative', 'integral', 'limit', 'function'],
    science: ['hypothesis', 'experiment', 'theory', 'law', 'molecule', 'atom', 'cell', 'energy'],
    programming: ['algorithm', 'data structure', 'variable', 'function', 'loop', 'condition', 'array', 'object'],
    webdev: ['element', 'selector', 'property', 'component', 'route', 'state', 'props', 'event'],
    business: ['strategy', 'market', 'customer', 'revenue', 'profit', 'growth', 'analysis', 'planning'],
    design: ['layout', 'color', 'typography', 'composition', 'hierarchy', 'balance', 'contrast', 'spacing']
  }

  const relevantTerms =
    subject in importantTerms
      ? importantTerms[subject as SubjectKey]
      : []
  
  for (const term of relevantTerms) {
    if (words.includes(term)) {
      concepts.push(term)
    }
  }

  return [...new Set(concepts)] // Remove duplicates
}

// Subject-specific question generators
function generateJavaScriptQuestions(concepts: string | any[], difficulty: string) {
  const questions = [
    {
      question: "What is the primary purpose of JavaScript in web development?",
      options: ["Styling web pages", "Adding interactivity and behavior", "Database management", "Server configuration"],
      correct: 1,
      explanation: "JavaScript is primarily used to add interactivity, dynamic behavior, and functionality to web pages."
    },
    {
      question: "Which of the following is a way to declare a variable in modern JavaScript?",
      options: ["var only", "let and const", "function", "import"],
      correct: 1,
      explanation: "Modern JavaScript uses 'let' for variables that can change and 'const' for constants that cannot be reassigned."
    }
  ]

  if (concepts.includes('async') || concepts.includes('promise')) {
    questions.push({
      question: "What is the purpose of async/await in JavaScript?",
      options: ["To handle synchronous operations", "To handle asynchronous operations more easily", "To create variables", "To style elements"],
      correct: 1,
      explanation: "Async/await provides a cleaner syntax for handling asynchronous operations compared to traditional callbacks or promise chains."
    })
  }

  if (concepts.includes('function')) {
    questions.push({
      question: "What is a JavaScript function?",
      options: ["A styling rule", "A reusable block of code", "A database query", "A server endpoint"],
      correct: 1,
      explanation: "A function is a reusable block of code that performs a specific task and can be called multiple times."
    })
  }

  return questions
}

function generatePythonQuestions(concepts: string | any[], difficulty: string) {
  const questions = [
    {
      question: "What makes Python popular for beginners?",
      options: ["Complex syntax", "Simple and readable syntax", "Fast execution speed", "Limited functionality"],
      correct: 1,
      explanation: "Python's simple and readable syntax makes it an excellent choice for beginners learning programming."
    },
    {
      question: "Which data structure is commonly used in Python to store multiple items?",
      options: ["String", "List", "Integer", "Boolean"],
      correct: 1,
      explanation: "Lists are one of the most commonly used data structures in Python for storing multiple items in order."
    }
  ]

  if (concepts.includes('pandas') || concepts.includes('data')) {
    questions.push({
      question: "What is Pandas primarily used for in Python?",
      options: ["Web development", "Data analysis and manipulation", "Game development", "Mobile apps"],
      correct: 1,
      explanation: "Pandas is a powerful library for data analysis and manipulation, especially for working with structured data."
    })
  }

  return questions
}

function generateMathQuestions(concepts: any[], difficulty: string) {
  if (difficulty === 'beginner') {
    return [
      {
        question: "What is the result of 5 + 3 × 2?",
        options: ["11", "16", "10", "13"],
        correct: 0,
        explanation: "Following order of operations (PEMDAS), multiplication comes before addition: 5 + (3 × 2) = 5 + 6 = 11."
      },
      {
        question: "What is 25% of 80?",
        options: ["15", "20", "25", "30"],
        correct: 1,
        explanation: "25% of 80 = 0.25 × 80 = 20."
      }
    ]
  } else {
    return [
      {
        question: "What is the derivative of x²?",
        options: ["x", "2x", "x²", "2"],
        correct: 1,
        explanation: "Using the power rule, the derivative of x² is 2x."
      },
      {
        question: "What is the integral of 2x?",
        options: ["x²", "x² + C", "2x²", "2"],
        correct: 1,
        explanation: "The integral of 2x is x² + C, where C is the constant of integration."
      }
    ]
  }
}

function generateScienceQuestions(concepts: any[], difficulty: string) {
  return [
    {
      question: "What is the basic unit of life?",
      options: ["Atom", "Molecule", "Cell", "Tissue"],
      correct: 2,
      explanation: "The cell is considered the basic unit of life, as it's the smallest unit that can perform all life functions."
    },
    {
      question: "What force keeps planets in orbit around the sun?",
      options: ["Magnetic force", "Electric force", "Gravitational force", "Nuclear force"],
      correct: 2,
      explanation: "Gravitational force between the sun and planets keeps them in their orbital paths."
    }
  ]
}

function generateProgrammingQuestions(concepts: any[], difficulty: string) {
  return [
    {
      question: "What is an algorithm?",
      options: ["A programming language", "A step-by-step solution to a problem", "A type of computer", "A software application"],
      correct: 1,
      explanation: "An algorithm is a step-by-step procedure or set of instructions for solving a problem."
    },
    {
      question: "What is the purpose of debugging in programming?",
      options: ["To write new code", "To find and fix errors", "To design user interfaces", "To optimize performance"],
      correct: 1,
      explanation: "Debugging is the process of finding and fixing errors or bugs in computer programs."
    }
  ]
}

function generateWebDevQuestions(concepts: any[], difficulty: string) {
  return [
    {
      question: "What does HTML stand for?",
      options: ["Hypertext Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyperlink Text Management Language"],
      correct: 0,
      explanation: "HTML stands for Hypertext Markup Language, used to structure content on web pages."
    },
    {
      question: "What is CSS primarily used for?",
      options: ["Adding interactivity", "Styling and layout", "Database management", "Server logic"],
      correct: 1,
      explanation: "CSS (Cascading Style Sheets) is used to style and control the layout of web pages."
    }
  ]
}

function generateBusinessQuestions(concepts: any[], difficulty: string) {
  return [
    {
      question: "What is the primary goal of most businesses?",
      options: ["To hire employees", "To make a profit", "To use technology", "To create websites"],
      correct: 1,
      explanation: "The primary goal of most businesses is to generate profit while providing value to customers."
    },
    {
      question: "What does ROI stand for in business?",
      options: ["Return on Investment", "Rate of Interest", "Revenue over Income", "Risk of Investment"],
      correct: 0,
      explanation: "ROI stands for Return on Investment, a measure of the efficiency of an investment."
    }
  ]
}

function generateDesignQuestions(concepts: any[], difficulty: string) {
  return [
    {
      question: "What is the purpose of white space in design?",
      options: ["To fill empty areas", "To improve readability and visual hierarchy", "To save ink", "To make designs smaller"],
      correct: 1,
      explanation: "White space (negative space) helps improve readability, creates visual hierarchy, and makes designs less cluttered."
    },
    {
      question: "What are complementary colors?",
      options: ["Colors that are the same", "Colors that are opposite on the color wheel", "Colors that are next to each other", "Colors that are black and white"],
      correct: 1,
      explanation: "Complementary colors are opposite each other on the color wheel and create high contrast when used together."
    }
  ]
}

function generateGeneralEducationQuestions(title: string, concepts: any[], difficulty: string) {
  return [
    {
      question: `Based on the title "${title}", what is the main learning objective?`,
      options: ["Entertainment only", "Acquiring new knowledge and skills", "Social networking", "Shopping"],
      correct: 1,
      explanation: "Educational content is designed to help learners acquire new knowledge and develop skills in specific areas."
    },
    {
      question: "What is the most effective way to learn from educational videos?",
      options: ["Watch passively", "Take notes and practice", "Skip difficult parts", "Watch at maximum speed"],
      correct: 1,
      explanation: "Active learning through note-taking and practice leads to better comprehension and retention."
    },
    {
      question: "Why is it important to understand the concepts rather than just memorize facts?",
      options: ["It's easier to memorize", "Understanding helps with problem-solving and application", "Facts are not important", "Concepts are always wrong"],
      correct: 1,
      explanation: "Understanding concepts enables you to apply knowledge to new situations and solve problems creatively."
    }
  ]
}

function generateDefaultQuestions(title: string) {
  return [
    {
      question: `What is the main topic of "${title}"?`,
      options: ["Entertainment", "Education and learning", "News", "Advertising"],
      correct: 1,
      explanation: "This video is educational content designed to teach and inform viewers about specific topics."
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    // Get video details first
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

    console.log(`Generating quiz for video: ${title}`)

    let quiz = null

    // Step 1: Try enhanced AI-powered quiz generation
    try {
      console.log('Attempting enhanced AI quiz generation...')
      quiz = await generateEnhancedAIQuiz(videoId, title, description)
      
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        console.log('Successfully generated enhanced AI quiz with', quiz.questions.length, 'questions')
        return NextResponse.json({
          ...quiz,
          metadata: {
            generatedBy: 'enhanced_ai',
            videoId,
            generatedAt: new Date().toISOString()
          }
        })
      }
    } catch (aiError) {
      console.log('Enhanced AI quiz generation failed:', aiError)
    }

    // Step 2: Try standard AI service
    try {
      console.log('Attempting standard AI quiz generation...')
      const aiServiceManager = AIServiceManager.getInstance()
      quiz = await aiServiceManager.generateQuiz(title, description)
      
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        console.log('Successfully generated standard AI quiz with', quiz.questions.length, 'questions')
        return NextResponse.json({
          ...quiz,
          metadata: {
            generatedBy: 'standard_ai',
            videoId,
            generatedAt: new Date().toISOString()
          }
        })
      }
    } catch (aiError) {
      console.log('Standard AI quiz generation failed:', aiError)
    }

    // Step 3: Use smart fallback with content analysis
    console.log('Using smart fallback quiz generation with content analysis...')
    quiz = generateSmartFallbackQuiz(title, description)
    
    return NextResponse.json({
      ...quiz,
      metadata: {
        generatedBy: 'smart_fallback',
        videoId,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Quiz generation error:', error)
    
    // Final emergency fallback
    const emergencyQuiz = {
      questions: [
        {
          question: "How can educational videos help with learning?",
          options: [
            "They provide visual and auditory learning",
            "They are just for entertainment", 
            "They replace all other learning methods",
            "They are not useful for learning"
          ],
          correct: 0,
          explanation: "Educational videos provide visual and auditory learning experiences that can enhance understanding and retention of information."
        },
        {
          question: "What should you do while watching educational content?",
          options: [
            "Multitask with other activities",
            "Take notes and ask questions",
            "Watch at maximum speed",
            "Skip the difficult parts"
          ],
          correct: 1,
          explanation: "Taking notes and asking questions helps you engage actively with the content and improves learning outcomes."
        },
        {
          question: "Why is it important to review educational material?",
          options: [
            "To waste time",
            "To reinforce learning and retention",
            "To show off knowledge",
            "It's not important"
          ],
          correct: 1,
          explanation: "Reviewing educational material helps reinforce learning and improves long-term retention of information."
        }
      ],
      metadata: {
        generatedBy: 'emergency_fallback',
        generatedAt: new Date().toISOString()
      }
    }
    
    return NextResponse.json(emergencyQuiz)
  }
}
