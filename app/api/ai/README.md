# AI Services Directory

This directory contains all AI-related code for the EduTube application, consolidated from the previous `lib/` folder structure.

## Directory Structure

```
app/api/ai/
├── services/                          # Core AI service implementations
│   ├── ai-service-manager.ts          # Main AI service factory and manager
│   ├── chatgpt-oss-service.ts         # ChatGPT OSS/Ollama integration
│   ├── google-ai-service.ts           # Google AI (Gemini) integration
│   ├── visual-generation-service.ts   # ASCII art and diagram generation
│   ├── config.ts                      # AI-specific configuration
│   └── types.ts                       # AI-specific TypeScript types
│
├── handwritten-notes/                 # Handwritten notes generation API
│   └── route.ts
├── notes/                             # Study notes generation API  
│   └── route.ts
├── quiz/                              # Quiz generation API
│   └── route.ts
├── video-summary/                     # Main video summary API (uses AI service manager)
│   └── route.ts
├── video-summary-ollama/              # Direct Ollama integration
│   └── route.ts
└── video-summary-oss/                 # ChatGPT OSS alternative route
    └── route.ts
```

## Consolidation Changes Made

### Files Moved to `app/api/ai/services/`:
- ✅ `lib/ai-service-manager.ts` → `app/api/ai/services/ai-service-manager.ts`
- ✅ `lib/chatgpt-oss-service.ts` → `app/api/ai/services/chatgpt-oss-service.ts`  
- ✅ `lib/google-ai-service.ts` → `app/api/ai/services/google-ai-service.ts`
- ✅ `lib/visual-generation-service.ts` → `app/api/ai/services/visual-generation-service.ts`

### Files Cleaned Up:
- ✅ Removed duplicate AI configuration from `lib/config.ts`
- ✅ Consolidated AI-specific types in `app/api/ai/services/types.ts`
- ✅ Updated imports to use `@/lib/types` for general API types
- ✅ Updated `scripts/update-video-summaries.ts` to use new import path

### Files Removed:
- ✅ `lib/ai-service-manager.ts` (moved)
- ✅ `lib/chatgpt-oss-service.ts` (moved)
- ✅ `lib/google-ai-service.ts` (moved)  
- ✅ `lib/visual-generation-service.ts` (moved)
- ✅ `lib/ai-service.ts` (if existed)

## AI Service Manager

The `AIServiceManager` is the main entry point for all AI operations. It automatically selects the best available AI service based on environment configuration:

1. **Google AI (Gemini)** - Primary choice if `GOOGLE_API_KEY` is configured
2. **ChatGPT OSS/Ollama** - Fallback if `CHATGPT_OSS_*` variables are configured  
3. **Enhanced Fallbacks** - Intelligent fallbacks based on video content analysis

## Configuration

AI services are configured via environment variables and the centralized config in `services/config.ts`:

```typescript
// Google AI
GOOGLE_API_KEY=your_google_api_key
GOOGLE_AI_MODEL=gemini-1.5-flash

// ChatGPT OSS / Ollama  
CHATGPT_OSS_API_URL=http://localhost:11434/v1/chat/completions
CHATGPT_OSS_MODEL=chatgpt-oss-120b

// Ollama (for direct integration)
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=llama2
```

## Available AI Services

### 1. Video Summary Generation
- **Endpoint**: `/api/ai/video-summary`
- **Service**: Uses AI Service Manager (auto-selects best service)
- **Features**: Intelligent summary, key points, difficulty assessment, subject classification

### 2. Quiz Generation  
- **Endpoint**: `/api/ai/quiz`
- **Service**: Uses AI Service Manager
- **Features**: Multiple choice questions with explanations

### 3. Study Notes Generation
- **Endpoint**: `/api/ai/notes`  
- **Service**: Uses AI Service Manager + Visual Generation Service
- **Features**: Structured notes with diagrams and visual elements

### 4. Handwritten Notes Generation
- **Endpoint**: `/api/ai/handwritten-notes`
- **Service**: Uses AI Service Manager + Visual Generation Service  
- **Features**: Student-style handwritten notes with ASCII diagrams

## Visual Generation Service

Generates ASCII art diagrams and visual elements for educational content:

- **Math Diagrams**: Equations, graphs, formulas
- **Science Diagrams**: Atomic structure, DNA, processes
- **Flowcharts**: Step-by-step processes
- **Mind Maps**: Concept relationships
- **Timelines**: Historical events and sequences

## Best Practices

### Import Structure
```typescript
// For general API types
import { ApiQuiz, ApiNotes } from '@/lib/types'

// For AI-specific types and services
import { AIAnalysis } from './types'
import { aiServiceManager } from './ai-service-manager'
```

### Error Handling
All AI services include comprehensive error handling with intelligent fallbacks:
- API quota exceeded → Enhanced fallback responses
- Service unavailable → Content-aware fallback generation
- Invalid responses → Structured fallback with helpful messages

### Extensibility
To add new AI services:
1. Implement the `AIService` interface in `services/`
2. Add configuration to `services/config.ts`
3. Update `AIServiceManager` to include the new service
4. Add environment variable validation

## Testing

The build system validates all imports and type definitions:
```bash
npm run build  # Validates entire AI service integration
```

## Migration Benefits

1. **Centralized AI Logic**: All AI code in one location
2. **Eliminated Duplication**: Removed duplicate service implementations
3. **Better Organization**: Clear separation of AI services from general app logic
4. **Improved Maintainability**: Easier to find and update AI-related code
5. **Consistent Imports**: Standardized import paths and type usage
