export class VisualGenerationService {
  private static instance: VisualGenerationService

  public static getInstance(): VisualGenerationService {
    if (!VisualGenerationService.instance) {
      VisualGenerationService.instance = new VisualGenerationService()
    }
    return VisualGenerationService.instance
  }

  // Generate diagrams for educational content
  async generateDiagramForContent(subject: string, content: string, type: 'diagram' | 'mindmap' | 'flowchart' | 'timeline' = 'diagram') {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    switch (type) {
      case 'mindmap':
        return this.generateMindMapDiagram(id, subject, content)
      case 'flowchart':
        return this.generateFlowchartDiagram(id, subject, content)
      case 'timeline':
        return this.generateTimelineDiagram(id, subject, content)
      default:
        return this.generateSubjectDiagram(id, subject, content)
    }
  }

  private generateSubjectDiagram(id: string, subject: string, content: string) {
    const lowerSubject = subject.toLowerCase()
    
    if (lowerSubject.includes('math') || lowerSubject.includes('mathematics')) {
      return {
        id,
        title: 'Mathematical Concepts',
        description: 'Key mathematical relationships and formulas',
        asciiArt: this.generateMathDiagram('algebra'),
        mermaidCode: `graph TD
    A[Mathematical Concept] --> B[Formula]
    A --> C[Example]
    A --> D[Application]
    B --> E[Variables]
    B --> F[Constants]`
      }
    } else if (lowerSubject.includes('science') || lowerSubject.includes('physics') || lowerSubject.includes('chemistry')) {
      return {
        id,
        title: 'Scientific Process',
        description: 'Scientific method and principles',
        asciiArt: this.generateScienceDiagram('atom_structure'),
        mermaidCode: `graph TD
    A[Scientific Method] --> B[Observation]
    B --> C[Hypothesis]
    C --> D[Experiment]
    D --> E[Analysis]
    E --> F[Conclusion]`
      }
    } else if (lowerSubject.includes('programming') || lowerSubject.includes('code')) {
      return {
        id,
        title: 'Programming Concepts',
        description: 'Software development principles',
        asciiArt: `
    Code Structure
    ┌─────────────────┐
    │ Input           │
    │       ↓         │
    │ Processing      │
    │       ↓         │
    │ Output          │
    └─────────────────┘`,
        mermaidCode: `graph TD
    A[Code] --> B[Functions]
    A --> C[Variables]
    A --> D[Logic]
    B --> E[Input]
    B --> F[Output]`
      }
    } else {
      return {
        id,
        title: 'Learning Concepts',
        description: 'General educational framework',
        asciiArt: `
    Learning Process
    ┌─────────────────┐
    │ 1. Introduction │
    │       ↓         │
    │ 2. Core Ideas   │
    │       ↓         │
    │ 3. Examples     │
    │       ↓         │
    │ 4. Practice     │
    └─────────────────┘`,
        mermaidCode: `graph TD
    A[Topic] --> B[Key Points]
    A --> C[Examples]
    A --> D[Applications]
    B --> E[Understanding]
    C --> E
    D --> E`
      }
    }
  }

  private generateMindMapDiagram(id: string, subject: string, content: string) {
    const concepts = this.extractKeyConceptsFromContent(content)
    
    return {
      id,
      title: 'Concept Map',
      description: 'Visual overview of key relationships',
      asciiArt: this.generateMindMap(subject, concepts.slice(0, 6)),
      mermaidCode: `mindmap
  root((${subject}))
    ${concepts.slice(0, 4).map(concept => concept.replace(/[^a-zA-Z0-9\s]/g, '')).join('\n    ')}`
    }
  }

  private generateFlowchartDiagram(id: string, subject: string, content: string) {
    const steps = this.extractStepsFromContent(content)
    
    return {
      id,
      title: 'Process Flow',
      description: 'Step-by-step process visualization',
      asciiArt: this.generateFlowchart(steps.slice(0, 4)),
      mermaidCode: `flowchart TD
    ${steps.slice(0, 4).map((step, i) => `${String.fromCharCode(65 + i)}[${step.substring(0, 20)}...]`).join('\n    ')}
    ${steps.slice(0, 3).map((_, i) => `${String.fromCharCode(65 + i)} --> ${String.fromCharCode(66 + i)}`).join('\n    ')}`
    }
  }

  private generateTimelineDiagram(id: string, subject: string, content: string) {
    const events = this.extractTimelineFromContent(content)
    
    return {
      id,
      title: 'Timeline',
      description: 'Chronological sequence of events',
      asciiArt: this.generateTimeline(events.slice(0, 4)),
      mermaidCode: `timeline
    title ${subject} Timeline
    ${events.slice(0, 4).map(event => `    ${event.date} : ${event.event}`).join('\n')}`
    }
  }

  private extractKeyConceptsFromContent(content: string): string[] {
    // Simple extraction - look for important words and phrases
    const words = content.toLowerCase().split(/[\s\n\r,.!?;]+/)
    const importantWords = words.filter(word => 
      word.length > 4 && 
      !['video', 'content', 'important', 'concept', 'understanding'].includes(word)
    )
    
    return [...new Set(importantWords)].slice(0, 8).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    )
  }

  private extractStepsFromContent(content: string): string[] {
    // Look for numbered steps or process indicators
    const sentences = content.split(/[.!?]+/)
    const steps = sentences.filter(sentence => 
      sentence.includes('step') || 
      sentence.includes('first') || 
      sentence.includes('then') || 
      sentence.includes('next') || 
      sentence.includes('finally') ||
      /^\s*\d+\./.test(sentence)
    )
    
    if (steps.length === 0) {
      return [
        'Start with basics',
        'Build understanding',
        'Apply concepts',
        'Review and practice'
      ]
    }
    
    return steps.slice(0, 6).map(step => step.trim().substring(0, 30))
  }

  private extractTimelineFromContent(content: string): Array<{ date: string, event: string }> {
    // Simple timeline extraction
    const defaultTimeline = [
      { date: 'Beginning', event: 'Introduction to topic' },
      { date: 'Development', event: 'Core concepts explained' },
      { date: 'Application', event: 'Examples and practice' },
      { date: 'Conclusion', event: 'Summary and review' }
    ]
    
    // Look for years or time markers in content
    const timeMarkers = content.match(/\b(19|20)\d{2}\b|\b\d{1,2}:\d{2}\b/g)
    if (timeMarkers && timeMarkers.length > 0) {
      return timeMarkers.slice(0, 4).map((time, i) => ({
        date: time,
        event: `Event ${i + 1}`
      }))
    }
    
    return defaultTimeline
  }

  // Generate ASCII art diagrams for mathematical concepts
  generateMathDiagram(concept: string): string {
    const mathDiagrams: Record<string, string> = {
      'quadratic_formula': `
    Quadratic Formula: ax² + bx + c = 0
    
         -b ± √(b² - 4ac)
    x = ─────────────────
              2a
    
    Where:
    • a, b, c are coefficients
    • ± means two solutions
    • Discriminant = b² - 4ac`,

      'trigonometry': `
    Unit Circle & Trig Functions
    
         π/2 (90°)
           |
           |
    π(180°)─┼─ 0(360°)
           |
           |
        3π/2 (270°)
    
    sin²θ + cos²θ = 1`,

      'calculus': `
    Derivative Rules:
    
    d/dx [x^n] = nx^(n-1)
    d/dx [sin x] = cos x
    d/dx [cos x] = -sin x
    d/dx [e^x] = e^x
    
    Chain Rule: d/dx[f(g(x))] = f'(g(x)) · g'(x)`,

      'algebra': `
    Linear Equation: y = mx + b
    
    y ↑
      |     /
      |    /  ← slope = m
      |   /
      |  /
      | /
    ──┼────────→ x
      |
      b (y-intercept)`
    }

    return mathDiagrams[concept] || this.generateGenericMathDiagram()
  }

  // Generate ASCII art for science concepts
  generateScienceDiagram(concept: string): string {
    const scienceDiagrams: Record<string, string> = {
      'atom_structure': `
    Atomic Structure
    
         Electron (e⁻)
           ○ ← Electron orbit
         ╱   ╲
       ○  ● ●  ○
         ╲   ╱    ● = Proton (p⁺)
           ○      ○ = Neutron (n⁰)
    
    Nucleus (Protons + Neutrons)`,

      'dna_structure': `
    DNA Double Helix
    
    A─T   ←─ Base Pairs
    │ │
    T─A
    │ │
    G≡C   ←─ Stronger bond
    │ │
    C≡G
    │ │
    A─T
    
    Sugar-Phosphate Backbone`,

      'water_cycle': `
    Water Cycle
    
    ☁️ Clouds ☁️
       ↓ Rain
    🏔️ Mountains → 🌊 Ocean
       ↑ Evaporation
    
    💧 Collection → 🌫️ Evaporation → ☁️ Condensation`,

      'photosynthesis': `
    Photosynthesis: 6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂
    
    🌞 Sunlight
       ↓
    🍃 Chloroplast
    ┌─────────────┐
    │ CO₂ + H₂O   │ → Glucose + O₂
    │   + Light   │
    └─────────────┘`
    }

    return scienceDiagrams[concept] || this.generateGenericScienceDiagram()
  }

  // Generate flowcharts using ASCII
  generateFlowchart(steps: string[]): string {
    if (steps.length === 0) return ''

    let flowchart = '\n    Process Flow:\n\n'
    
    steps.forEach((step, index) => {
      const isLast = index === steps.length - 1
      const stepNumber = index + 1
      
      flowchart += `    ┌─────────────────┐\n`
      flowchart += `    │ ${stepNumber}. ${step.substring(0, 15).padEnd(15)} │\n`
      flowchart += `    └─────────────────┘\n`
      
      if (!isLast) {
        flowchart += `              ↓\n`
      }
    })

    return flowchart
  }

  // Generate mind maps using ASCII
  generateMindMap(centralTopic: string, branches: string[]): string {
    if (branches.length === 0) return ''

    let mindMap = `\n    Mind Map: ${centralTopic}\n\n`
    mindMap += `           ${branches[0] || 'Branch'}\n`
    mindMap += `              |\n`
    mindMap += `    ${branches[1] || 'Branch'} ──── ${centralTopic} ──── ${branches[2] || 'Branch'}\n`
    mindMap += `              |\n`
    mindMap += `           ${branches[3] || branches[0] || 'Branch'}\n`

    if (branches.length > 4) {
      mindMap += `\n    Additional concepts:\n`
      branches.slice(4).forEach((branch, index) => {
        mindMap += `    • ${branch}\n`
      })
    }

    return mindMap
  }

  // Generate timeline ASCII art
  generateTimeline(events: Array<{ date: string, event: string }>): string {
    if (events.length === 0) return ''

    let timeline = '\n    Timeline:\n\n'
    
    events.forEach((event, index) => {
      const isEven = index % 2 === 0
      if (isEven) {
        timeline += `    ${event.date}\n`
        timeline += `      |─── ${event.event}\n`
        timeline += `      |\n`
      } else {
        timeline += `      |─── ${event.event}\n`
        timeline += `    ${event.date}\n`
        timeline += `      |\n`
      }
    })

    return timeline
  }

  // Generate concept relationship diagrams
  generateConceptMap(concepts: Array<{ from: string, to: string, relationship: string }>): string {
    if (concepts.length === 0) return ''

    let conceptMap = '\n    Concept Relationships:\n\n'
    
    concepts.forEach((concept, index) => {
      conceptMap += `    ${concept.from} ──[${concept.relationship}]── ${concept.to}\n`
    })

    return conceptMap
  }

  private generateGenericMathDiagram(): string {
    return `
    Mathematical Concepts
    ┌─────────────────┐
    │   f(x) = y      │
    │                 │
    │ Input → Process │
    │   x   →   f     │
    │         ↓       │
    │      Output     │
    │        y        │
    └─────────────────┘`
  }

  private generateGenericScienceDiagram(): string {
    return `
    Scientific Method
    ┌─────────────────┐
    │ 1. Observation  │
    │       ↓         │
    │ 2. Hypothesis   │
    │       ↓         │
    │ 3. Experiment   │
    │       ↓         │
    │ 4. Analysis     │
    │       ↓         │
    │ 5. Conclusion   │
    └─────────────────┘`
  }
}

export const visualGenerationService = VisualGenerationService.getInstance()
