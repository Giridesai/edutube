'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import { 
  getVideoInteractions, 
  toggleVideoInteraction, 
  getVideoPlaylists, 
  manageVideoInPlaylists,
  createPlaylist,
  getShareData,
  trackShareEvent,
  copyToClipboard,
  formatShareUrl
} from '@/lib/api-client'
import { VideoInteractionResponse, ApiPlaylist, ShareDataResponse } from '@/lib/types'

interface Video {
  id: string
  title: string
  channelTitle?: string
  channelId?: string
  thumbnailUrl?: string
  duration?: string
  publishedAt?: string
  description?: string
  viewCount?: number
  likeCount?: number
  summary?: string
  keyPoints?: string[]
  chapters?: Array<{ start: number; title: string }>
  tags?: string[]
}

interface Comment {
  id: string
  author: string
  authorAvatar?: string
  text: string
  likes: number
  published: string
  replies?: Comment[]
}

interface Quiz {
  questions: Array<{
    question: string
    options: string[]
    correct: number
    explanation: string
  }>
}

interface Notes {
  title: string
  content: string
  keyPoints: string[]
  diagrams?: Array<{
    id: string
    type: 'flowchart' | 'mindmap' | 'diagram' | 'equation' | 'timeline'
    title: string
    description: string
    asciiArt?: string
    mermaidCode?: string
  }>
  visualElements?: Array<{
    type: 'highlight' | 'box' | 'arrow' | 'underline' | 'star'
    content: string
    position: string
  }>
}

interface HandwrittenNotes {
  title: string
  subject: string
  date: string
  sections: Array<{
    heading: string
    content: string
    timestamp?: string
    importance: 'high' | 'medium' | 'low'
    hasVisual?: boolean
    visualType?: 'diagram' | 'equation' | 'flowchart' | 'mindmap'
  }>
  diagrams: Array<{
    id: string
    type: 'flowchart' | 'mindmap' | 'diagram' | 'equation' | 'timeline'
    title: string
    description: string
    mermaidCode?: string
    asciiArt?: string
    placement: string
  }>
  keyPoints: string[]
  summary: string
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading video...</p>
        </div>
      </div>
    }>
      <WatchPageContent />
    </Suspense>
  )
}

function WatchPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const videoId = searchParams.get('v')
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)
  const [notes, setNotes] = useState<Notes | null>(null)
  const [notesLoading, setNotesLoading] = useState(false)
  const [handwrittenNotes, setHandwrittenNotes] = useState<HandwrittenNotes | null>(null)
  const [handwrittenNotesLoading, setHandwrittenNotesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'comments' | 'quiz' | 'notes' | 'handwritten'>('summary')
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: number}>({})
  const [showResults, setShowResults] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  // New state for backend functionality
  const [interactions, setInteractions] = useState<VideoInteractionResponse | null>(null)
  const [playlists, setPlaylists] = useState<ApiPlaylist[]>([])
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareData, setShareData] = useState<ShareDataResponse['shareData'] | null>(null)
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [descriptionLoading, setDescriptionLoading] = useState(false)

  // Helper to record watch history without using external APIs
  const sendWatchHistory = async (watchTimeSec: number, completed: boolean = false) => {
    try {
      if (!videoId || status === 'loading' || status === 'unauthenticated') return
      await fetch('/api/watch-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, watchTime: Math.max(0, Math.floor(watchTimeSec)), completed }),
        keepalive: true,
      })
    } catch (e) {
      // swallow errors to avoid impacting UX
      console.debug('watch history update failed')
    }
  }

  // PDF generation functions - BEAUTIFUL & SIMPLE VERSION
  const generateNotesPDF = () => {
    if (!notes) return
    
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // ELEGANT PAPER BACKGROUND
    pdf.setFillColor(254, 254, 251) // Warm white
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    
    // SIMPLE NOTEBOOK LINES
    pdf.setDrawColor(230, 230, 240)
    pdf.setLineWidth(0.3)
    for (let i = 50; i < pageHeight - 20; i += 25) {
      pdf.line(margin, i, pageWidth - margin, i)
    }
    
    // LEFT MARGIN
    pdf.setDrawColor(255, 100, 100)
    pdf.setLineWidth(1)
    pdf.line(margin + 30, 0, margin + 30, pageHeight)

    // SIMPLE, CLEAN TEXT FUNCTION
    const addText = (text: string, x: number, y: number, style: {
      size?: number,
      color?: string,
      font?: 'normal' | 'bold' | 'italic',
      highlight?: boolean
    } = {}) => {
      const { size = 12, color = '#1a1a2e', font = 'normal', highlight = false } = style
      
      pdf.setFontSize(size)
      pdf.setFont('helvetica', font)
      
      // Parse color
      const colorMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
      if (colorMatch) {
        const r = parseInt(colorMatch[1], 16)
        const g = parseInt(colorMatch[2], 16)
        const b = parseInt(colorMatch[3], 16)
        pdf.setTextColor(r, g, b)
      }
      
      // Highlight background
      if (highlight) {
        const textWidth = pdf.getStringUnitWidth(text) * size / pdf.internal.scaleFactor
        pdf.setFillColor(255, 255, 180, 0.7)
        pdf.rect(x - 2, y - size * 0.8, textWidth + 4, size + 2, 'F')
      }
      
      pdf.text(text, x, y)
      return size + 8 // Clean line spacing
    }

    // BEAUTIFUL HEADER
    yPosition += 30
    pdf.setDrawColor(100, 100, 200)
    pdf.setLineWidth(3)
    pdf.line(margin, yPosition - 10, pageWidth - margin, yPosition - 10)
    
    yPosition += addText(notes.title || '📖 Study Notes', margin + 40, yPosition, {
      size: 24,
      color: '#2d3748',
      font: 'bold'
    })
    
    yPosition += addText(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
    }), margin + 40, yPosition, {
      size: 10,
      color: '#718096',
      font: 'italic'
    })
    
    yPosition += 30

    // CLEAN CONTENT
    if (notes.content) {
      yPosition += addText('📝 Content', margin + 40, yPosition, {
        size: 16,
        color: '#2b6cb0',
        font: 'bold'
      })
      
      const paragraphs = notes.content.split('\n\n')
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          yPosition += 10
          
          // Check for page break
          if (yPosition > pageHeight - 50) {
            pdf.addPage()
            pdf.setFillColor(254, 254, 251)
            pdf.rect(0, 0, pageWidth, pageHeight, 'F')
            
            // Recreate lines
            pdf.setDrawColor(230, 230, 240)
            pdf.setLineWidth(0.3)
            for (let i = 50; i < pageHeight - 20; i += 25) {
              pdf.line(margin, i, pageWidth - margin, i)
            }
            pdf.setDrawColor(255, 100, 100)
            pdf.setLineWidth(1)
            pdf.line(margin + 30, 0, margin + 30, pageHeight)
            
            yPosition = margin + 40
          }
          
          const lines = paragraph.split('\n')
          lines.forEach(line => {
            if (line.startsWith('•') || line.startsWith('-')) {
              addText('•', margin + 45, yPosition, { color: '#e53e3e', size: 14 })
              yPosition += addText(line.substring(1).trim(), margin + 55, yPosition, {
                size: 11,
                color: '#2d3748'
              })
            } else {
              yPosition += addText(line, margin + 40, yPosition, {
                size: 11,
                color: '#2d3748'
              })
            }
          })
        }
      })
    }

    // KEY POINTS - SIMPLE & ELEGANT
    if (notes.keyPoints && notes.keyPoints.length > 0) {
      yPosition += 30
      
      yPosition += addText('⭐ Key Points', margin + 40, yPosition, {
        size: 16,
        color: '#d69e2e',
        font: 'bold'
      })
      
      notes.keyPoints.forEach((point, index) => {
        yPosition += 15
        addText(`${index + 1}.`, margin + 45, yPosition, { 
          color: '#d69e2e', 
          font: 'bold',
          size: 12
        })
        yPosition += addText(point, margin + 60, yPosition, {
          size: 11,
          color: '#2d3748',
          highlight: true
        })
      })
    }

    // DIAGRAMS - CLEAN PRESENTATION
    if (notes.diagrams && notes.diagrams.length > 0) {
      yPosition += 30
      
      yPosition += addText('🎨 Diagrams', margin + 40, yPosition, {
        size: 16,
        color: '#805ad5',
        font: 'bold'
      })
      
      notes.diagrams.forEach((diagram, index) => {
        yPosition += 20
        
        yPosition += addText(`${index + 1}. ${diagram.title}`, margin + 45, yPosition, {
          size: 13,
          color: '#805ad5',
          font: 'bold'
        })
        
        yPosition += addText(diagram.description, margin + 50, yPosition, {
          size: 10,
          color: '#718096',
          font: 'italic'
        })

        if (diagram.asciiArt) {
          yPosition += 15
          
          // Simple frame
          pdf.setDrawColor(200, 200, 200)
          pdf.setLineWidth(1)
          const lines = diagram.asciiArt.split('\n')
          const boxHeight = lines.length * 10 + 10
          pdf.rect(margin + 40, yPosition - 5, pageWidth - margin - 80, boxHeight, 'D')
          
          // ASCII content
          pdf.setFont('courier', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(60, 60, 60)
          
          lines.forEach(line => {
            pdf.text(line, margin + 45, yPosition)
            yPosition += 10
          })
          yPosition += 10
        }
      })
    }

    // SIMPLE FOOTER
    const totalPages = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(9)
      pdf.setTextColor(120, 120, 120)
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2 - 15, pageHeight - 15)
    }

    // CLEAN FILENAME
    pdf.save(`Study Notes - ${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const generateHandwrittenNotesPDF = () => {
    if (!handwrittenNotes) return

    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // BEAUTIFUL NOTEBOOK BACKGROUND
    pdf.setFillColor(252, 252, 250) // Cream paper
    pdf.rect(0, 0, pageWidth, pageHeight, 'F')
    
    // NOTEBOOK HOLES (3-ring binder style)
    pdf.setFillColor(255, 255, 255)
    const holes = [60, pageHeight/2, pageHeight - 60]
    holes.forEach(y => {
      pdf.circle(15, y, 4, 'F')
      pdf.setDrawColor(200, 200, 200)
      pdf.circle(15, y, 4, 'D')
    })
    
    // RULED LINES
    pdf.setDrawColor(220, 220, 235)
    pdf.setLineWidth(0.3)
    for (let i = 50; i < pageHeight - 20; i += 25) {
      pdf.line(margin + 25, i, pageWidth - margin, i)
    }
    
    // LEFT MARGIN LINE (RED)
    pdf.setDrawColor(255, 100, 100)
    pdf.setLineWidth(1)
    pdf.line(margin + 25, 0, margin + 25, pageHeight)

    // SIMPLE HANDWRITTEN TEXT
    const addText = (text: string, x: number, y: number, style: {
      size?: number,
      color?: string,
      weight?: 'normal' | 'bold',
      highlight?: boolean,
      underline?: boolean
    } = {}) => {
      const { size = 12, color = '#2d3748', weight = 'normal', highlight = false, underline = false } = style
      
      // Slight handwriting variation
      const xOffset = (Math.random() - 0.5) * 0.4
      const yOffset = (Math.random() - 0.5) * 0.3
      
      pdf.setFontSize(size)
      pdf.setFont('helvetica', weight)
      
      // Parse color
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        pdf.setTextColor(r, g, b)
      }
      
      // Highlight
      if (highlight) {
        const textWidth = pdf.getStringUnitWidth(text) * size / pdf.internal.scaleFactor
        pdf.setFillColor(255, 255, 100, 0.4)
        pdf.rect(x + xOffset - 1, y + yOffset - size * 0.8, textWidth + 2, size + 1, 'F')
      }
      
      // Text
      pdf.text(text, x + xOffset, y + yOffset)
      
      // Underline
      if (underline) {
        const textWidth = pdf.getStringUnitWidth(text) * size / pdf.internal.scaleFactor
        pdf.setDrawColor(color === '#2d3748' ? 45 : 100, color === '#2d3748' ? 55 : 100, color === '#2d3748' ? 72 : 100)
        pdf.setLineWidth(0.5)
        pdf.line(x + xOffset, y + yOffset + 2, x + xOffset + textWidth, y + yOffset + 2)
      }
      
      return size + 8
    }

    // HEADER
    yPosition += 40
    yPosition += addText(handwrittenNotes.title || '📝 Handwritten Study Notes', margin + 35, yPosition, {
      size: 20,
      color: '#1a365d',
      weight: 'bold'
    })
    
    yPosition += addText(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric' 
    }), margin + 35, yPosition, {
      size: 10,
      color: '#718096'
    })

    yPosition += 25

    // SECTIONS
    if (handwrittenNotes.sections && handwrittenNotes.sections.length > 0) {
      handwrittenNotes.sections.forEach((section, index) => {
        // Section header
        yPosition += 15
        yPosition += addText(`${index + 1}. ${section.heading}`, margin + 35, yPosition, {
          size: 14,
          color: '#2b6cb0',
          weight: 'bold',
          underline: true
        })

        // Section content
        if (section.content) {
          const paragraphs = section.content.split('\n\n')
          paragraphs.forEach(paragraph => {
            if (paragraph.trim()) {
              yPosition += 10
              
              // Page break check
              if (yPosition > pageHeight - 50) {
                pdf.addPage()
                pdf.setFillColor(252, 252, 250)
                pdf.rect(0, 0, pageWidth, pageHeight, 'F')
                
                // Holes
                holes.forEach(y => {
                  pdf.setFillColor(255, 255, 255)
                  pdf.circle(15, y, 4, 'F')
                  pdf.setDrawColor(200, 200, 200)
                  pdf.circle(15, y, 4, 'D')
                })
                
                // Lines
                pdf.setDrawColor(220, 220, 235)
                pdf.setLineWidth(0.3)
                for (let i = 50; i < pageHeight - 20; i += 25) {
                  pdf.line(margin + 25, i, pageWidth - margin, i)
                }
                pdf.setDrawColor(255, 100, 100)
                pdf.setLineWidth(1)
                pdf.line(margin + 25, 0, margin + 25, pageHeight)
                
                yPosition = margin + 30
              }
              
              const lines = paragraph.split('\n')
              lines.forEach(line => {
                if (line.startsWith('•') || line.startsWith('-')) {
                  addText('•', margin + 40, yPosition, { color: '#e53e3e', size: 14 })
                  yPosition += addText(line.substring(1).trim(), margin + 50, yPosition, {
                    size: 11,
                    color: '#2d3748'
                  })
                } else {
                  yPosition += addText(line, margin + 40, yPosition, {
                    size: 11,
                    color: '#2d3748'
                  })
                }
              })
            }
          })
        }
      })
    }

    // DIAGRAMS
    if (handwrittenNotes.diagrams && handwrittenNotes.diagrams.length > 0) {
      yPosition += 30
      
      yPosition += addText('📊 Diagrams & Visuals', margin + 35, yPosition, {
        size: 16,
        color: '#805ad5',
        weight: 'bold',
        underline: true
      })
      
      handwrittenNotes.diagrams.forEach((diagram, index) => {
        yPosition += 20
        
        yPosition += addText(`${index + 1}. ${diagram.title}`, margin + 40, yPosition, {
          size: 13,
          color: '#805ad5',
          weight: 'bold'
        })
        
        yPosition += addText(diagram.description, margin + 45, yPosition, {
          size: 10,
          color: '#718096'
        })

        if (diagram.asciiArt) {
          yPosition += 15
          
          // Simple frame
          pdf.setDrawColor(180, 180, 180)
          pdf.setLineWidth(1)
          const lines = diagram.asciiArt.split('\n')
          const boxHeight = lines.length * 10 + 10
          pdf.rect(margin + 40, yPosition - 5, pageWidth - margin - 80, boxHeight, 'D')
          
          // ASCII content
          pdf.setFont('courier', 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(60, 60, 60)
          
          lines.forEach(line => {
            pdf.text(line, margin + 45, yPosition)
            yPosition += 10
          })
          yPosition += 15
        }
      })
    }

    // SIMPLE FOOTER
    const totalPages = pdf.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(9)
      pdf.setTextColor(120, 120, 120)
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2 - 15, pageHeight - 15)
      pdf.text(new Date().toLocaleDateString(), pageWidth - 60, pageHeight - 15)
    }

    pdf.save(`Handwritten Notes - ${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Helper function to extract key points from content when API doesn't provide them
  const extractKeyPointsFromContent = (content: string, sections: any[] = []) => {
    const keyPoints: string[] = []
    
    // Extract from section headings (these are usually important)
    if (sections && Array.isArray(sections)) {
      sections.forEach((section: any) => {
        if (section.heading && section.importance === 'high') {
          keyPoints.push(section.heading.replace(/[📚🎯💡📝]/g, '').trim())
        }
      })
    }
    
    // Extract bullet points from content
    const bulletPattern = /•\s*([^•\n]{10,100})/g
    let match
    while ((match = bulletPattern.exec(content)) !== null && keyPoints.length < 8) {
      const point = match[1].trim()
      if (point.length > 15 && !keyPoints.includes(point)) {
        keyPoints.push(point)
      }
    }
    
    // If still no key points, create some generic ones
    if (keyPoints.length === 0) {
      return [
        "Comprehensive educational content with structured learning",
        "Clear explanations and practical examples provided",
        "Important concepts broken down for better understanding",
        "Valuable resource for building knowledge foundation"
      ]
    }
    
    return keyPoints.slice(0, 6) // Limit to 6 key points
  }

  // Auto-generate key points when video loads
  const generateKeyPointsForVideo = async (videoData: Video) => {
    console.log('Auto-generating key points for video:', videoData.title)
    
    try {
      // Use the existing video-summary API which already handles key points
      const response = await fetch(`/api/ai/video-summary?videoId=${videoData.id}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Video summary API response:', data)
        
        // Extract key points from the API response
        if (data.keyPoints && Array.isArray(data.keyPoints) && data.keyPoints.length > 0) {
          console.log('Using key points from video summary API:', data.keyPoints)
          setVideo(prev => prev ? { ...prev, keyPoints: data.keyPoints } : null)
          return
        }
      } else {
        console.log('Video summary API failed:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('Error calling video summary API:', error)
    }
    
    // Fallback: Generate key points from video metadata
    const fallbackKeyPoints = generateFallbackKeyPoints(videoData)
    console.log('Using fallback key points:', fallbackKeyPoints)
    setVideo(prev => prev ? { ...prev, keyPoints: fallbackKeyPoints } : null)
  }

  // New handler functions for backend interactions
  const handleLikeVideo = async () => {
    if (!session?.user || !videoId) return
    
    setActionLoading('like')
    try {
      const result = await toggleVideoInteraction(videoId, { type: 'like', action: 'toggle' })
      setInteractions(prev => prev ? {
        userInteractions: {
          ...prev.userInteractions,
          liked: result.action === 'added'
        },
        counts: result.counts
      } : null)
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveVideo = async () => {
    if (!session?.user || !videoId) return
    
    setActionLoading('save')
    try {
      const result = await toggleVideoInteraction(videoId, { type: 'save', action: 'toggle' })
      setInteractions(prev => prev ? {
        userInteractions: {
          ...prev.userInteractions,
          saved: result.action === 'added'
        },
        counts: result.counts
      } : null)
    } catch (error) {
      console.error('Error toggling save:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddToPlaylist = async () => {
    if (!session?.user || !videoId) return
    
    try {
      const playlistsData = await getVideoPlaylists(videoId)
      setPlaylists(playlistsData.playlists)
      setShowPlaylistModal(true)
    } catch (error) {
      console.error('Error fetching playlists:', error)
    }
  }

  const handlePlaylistToggle = async (playlistId: string, isAdding: boolean) => {
    if (!videoId) return
    
    try {
      await manageVideoInPlaylists(videoId, {
        playlistIds: playlistId,
        action: isAdding ? 'add' : 'remove'
      })
      
      // Update local state
      setPlaylists(prev => prev.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, containsVideo: isAdding }
          : playlist
      ))
    } catch (error) {
      console.error('Error toggling playlist:', error)
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) return
    
    try {
      const result = await createPlaylist({
        title: newPlaylistTitle.trim(),
        description: 'Created from video watch page',
        isPublic: false
      })
      
      // Add new playlist to list
      setPlaylists(prev => [...prev, { ...result.playlist, containsVideo: false }])
      setNewPlaylistTitle('')
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }

  const handleShare = async () => {
    if (!videoId) return
    
    try {
      const result = await getShareData(videoId)
      setShareData(result.shareData)
      setShowShareModal(true)
    } catch (error) {
      console.error('Error getting share data:', error)
    }
  }

  const handleSocialShare = async (platform: string) => {
    if (!shareData || !videoId) return
    
    try {
      const url = formatShareUrl(shareData, platform)
      window.open(url, '_blank', 'width=600,height=400')
      
      // Track share event
      await trackShareEvent(videoId, { platform })
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleCopyLink = async () => {
    if (!shareData) return
    
    try {
      await copyToClipboard(shareData.url)
      // Could add a toast notification here
      console.log('Link copied to clipboard')
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  // Function to convert URLs in text to clickable links
  const convertUrlsToLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">${url}</a>`)
  }

  // Enhanced description toggle with smooth animation
  const handleDescriptionToggle = () => {
    setDescriptionLoading(true)
    // Small delay for smooth animation effect
    setTimeout(() => {
      setIsDescriptionExpanded(!isDescriptionExpanded)
      setDescriptionLoading(false)
    }, 150)
  }

  // Load user interactions when video loads
  const loadUserInteractions = async () => {
    if (status === 'loading' || !videoId) return
    if (status === 'unauthenticated' || !session?.user) return
    
    try {
      const interactionsData = await getVideoInteractions(videoId)
      setInteractions(interactionsData)
    } catch (error) {
      console.error('Error loading user interactions:', error)
    }
  }

  // Generate fallback key points from video metadata
  const generateFallbackKeyPoints = (videoData: Video) => {
    const keyPoints: string[] = []
    
    // Extract from title
    if (videoData.title) {
      const title = videoData.title.toLowerCase()
      
      // Subject-specific key points
      if (title.includes('math') || title.includes('calculus') || title.includes('algebra')) {
        keyPoints.push("Mathematical concepts and problem-solving techniques")
        keyPoints.push("Step-by-step solutions and formulas")
      } else if (title.includes('science') || title.includes('physics') || title.includes('chemistry')) {
        keyPoints.push("Scientific principles and natural phenomena")
        keyPoints.push("Experimental methods and observations")
      } else if (title.includes('history') || title.includes('ancient') || title.includes('war')) {
        keyPoints.push("Historical events and their significance")
        keyPoints.push("Causes, effects, and timeline of important periods")
      } else if (title.includes('programming') || title.includes('code') || title.includes('javascript')) {
        keyPoints.push("Programming concepts and best practices")
        keyPoints.push("Code examples and practical implementation")
      } else {
        keyPoints.push("Core concepts and fundamental principles")
        keyPoints.push("Practical applications and real-world examples")
      }
    }
    
    // Add generic educational points
    keyPoints.push("Clear explanations with supporting evidence")
    keyPoints.push("Structured learning approach for better understanding")
    
    // Add description-based points if available
    if (videoData.description && videoData.description.length > 100) {
      keyPoints.push("Comprehensive coverage of the topic with detailed insights")
    }
    
    return keyPoints.slice(0, 5) // Limit to 5 key points
  }

  useEffect(() => {
    if (!videoId) {
      setError('No video ID provided')
      setLoading(false)
      return
    }

    // Fetch video details
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch video details')
        }
        const data = await response.json()
        setVideo(data.video)
        
        // Automatically generate key points when video is loaded
        if (data.video) {
          generateKeyPointsForVideo(data.video)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    fetchVideo()
  }, [videoId])

  // Load user interactions when auth status changes
  useEffect(() => {
    if (status === 'authenticated' && session?.user && videoId) {
      loadUserInteractions()
    }
  }, [status, session?.user, videoId])

  // When authenticated and watching, record watch history using only our DB
  useEffect(() => {
    if (status === 'loading' || !videoId) return
    if (status === 'unauthenticated' || !session?.user) return

    let start = Date.now()
    let stopped = false

    // Create/refresh entry at start
    sendWatchHistory(0, false)

    // Periodically update approximate watch time based on time on page
    const interval = setInterval(() => {
      if (stopped) return
      const elapsed = (Date.now() - start) / 1000
      sendWatchHistory(elapsed, false)
    }, 15000)

    const beforeUnload = () => {
      const elapsed = (Date.now() - start) / 1000
      try {
        const payload = JSON.stringify({ videoId, watchTime: Math.max(0, Math.floor(elapsed)), completed: false })
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' })
          navigator.sendBeacon('/api/watch-history', blob)
        } else {
          // Fallback (may not always send)
          void fetch('/api/watch-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          })
        }
      } catch {}
    }

    window.addEventListener('beforeunload', beforeUnload)

    return () => {
      stopped = true
      window.removeEventListener('beforeunload', beforeUnload)
      clearInterval(interval)
      const elapsed = (Date.now() - start) / 1000
      sendWatchHistory(elapsed, false)
    }
  }, [status, session?.user, videoId])

  const fetchSummary = async () => {
    if (!videoId) return
    setSummaryLoading(true)
    try {
      const response = await fetch(`/api/ai/video-summary?videoId=${videoId}`)
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err)
    } finally {
      setSummaryLoading(false)
    }
  }

  const fetchComments = async () => {
    if (!videoId) return
    setCommentsLoading(true)
    try {
      const response = await fetch(`/api/youtube/video/${videoId}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  const fetchQuiz = async () => {
    if (!videoId) return
    setQuizLoading(true)
    setSelectedAnswers({})
    setShowResults(false)
    setQuizScore(0)
    try {
      const response = await fetch(`/api/ai/quiz?videoId=${videoId}`)
      if (response.ok) {
        const data = await response.json()
        setQuiz(data)
      }
    } catch (err) {
      console.error('Failed to fetch quiz:', err)
    } finally {
      setQuizLoading(false)
    }
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    if (showResults) return // Don't allow changes after showing results
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }))
  }

  const submitQuiz = () => {
    if (!quiz) return
    
    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct) {
        score++
      }
    })
    
    setQuizScore(score)
    setShowResults(true)
  }

  const resetQuiz = () => {
    setSelectedAnswers({})
    setShowResults(false)
    setQuizScore(0)
  }

  const isQuizComplete = quiz ? Object.keys(selectedAnswers).length === quiz.questions.length : false

  const fetchNotes = async () => {
    if (!videoId) return
    setNotesLoading(true)
    try {
      const response = await fetch(`/api/ai/handwritten-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Handwritten notes response:', data) // Debug log
        
        // Transform handwritten notes data to match Notes interface
        const transformedNotes = {
          title: data.notes.title || 'Study Notes',
          content: data.notes.sections?.map((section: any) => 
            `${section.heading}\n\n${section.content}`
          ).join('\n\n') || 'No content available',
          keyPoints: data.notes.keyPoints || [],
          diagrams: data.notes.diagrams?.map((diagram: any) => ({
            title: diagram.title,
            description: diagram.description,
            type: diagram.type,
            asciiArt: diagram.asciiArt
          })) || [],
          visualElements: data.notes.visualElements || []
        }
        
        // If no key points from API, try to extract them from content
        if (!transformedNotes.keyPoints || transformedNotes.keyPoints.length === 0) {
          console.log('No keyPoints from API, extracting from content...')
          transformedNotes.keyPoints = extractKeyPointsFromContent(transformedNotes.content, data.notes.sections)
        }
        
        console.log('Transformed notes keyPoints:', transformedNotes.keyPoints)
        console.log('KeyPoints type:', typeof transformedNotes.keyPoints, 'Array?', Array.isArray(transformedNotes.keyPoints), 'Length:', transformedNotes.keyPoints?.length)
        
        setNotes(transformedNotes)
      } else {
        console.error('Failed to fetch notes:', response.status, response.statusText)
      }
    } catch (err) {
      console.error('Failed to fetch notes:', err)
    } finally {
      setNotesLoading(false)
    }
  }

  const fetchHandwrittenNotes = async () => {
    if (!videoId) return
    setHandwrittenNotesLoading(true)
    try {
      const response = await fetch(`/api/ai/handwritten-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId })
      })
      if (response.ok) {
        const data = await response.json()
        setHandwrittenNotes(data.notes)
      }
    } catch (err) {
      console.error('Failed to fetch handwritten notes:', err)
    } finally {
      setHandwrittenNotesLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="aspect-video bg-gray-800 rounded-lg mb-4"></div>
            <div className="h-8 bg-gray-800 rounded mb-2"></div>
            <div className="h-4 bg-gray-800 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="material-icons text-gray-500 text-2xl">error</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Video Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'This video could not be loaded'}</p>
          <Link 
            href="/dashboard" 
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Navigation Header */}
      <nav className="border-b border-gray-800 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard" 
              className="flex items-center text-gray-300 hover:text-white transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                <span className="material-icons text-sm">arrow_back</span>
              </div>
              <span className="font-medium">Back to Discover</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <span className="material-icons text-gray-300">share</span>
              </button>
              <button className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                <span className="material-icons text-gray-300">bookmark_add</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main video section */}
          <div className="xl:col-span-3">
            {/* Video player with modern styling */}
            <div className="relative group mb-6">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800/50">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={video.title}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
              {/* Gradient overlay for premium feel */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none"></div>
            </div>

            {/* Video info card with enhanced display */}
            <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 shadow-xl mb-6">
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {video.title}
              </h1>
              
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center space-x-6">
                  {/* Channel info */}
                  <div className="flex items-center space-x-3">
                    {/* Clickable channel logo */}
                    {video.channelId ? (
                      <Link
                        href={`/dashboard/channel/${video.channelId}`}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer group"
                        title={`View ${video.channelTitle} channel`}
                      >
                        <span className="text-lg font-bold text-white group-hover:scale-110 transition-transform">
                          {video.channelTitle?.charAt(0).toUpperCase() || 'Y'}
                        </span>
                      </Link>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                        <span className="text-lg font-bold text-white">
                          {video.channelTitle?.charAt(0).toUpperCase() || 'Y'}
                        </span>
                      </div>
                    )}
                    <div>
                      {/* Clickable channel title */}
                      {video.channelId ? (
                        <Link
                          href={`/dashboard/channel/${video.channelId}`}
                          className="font-semibold text-gray-200 hover:text-white hover:underline transition-colors duration-200 group flex items-center"
                          title={`View ${video.channelTitle} channel`}
                        >
                          <span>{video.channelTitle}</span>
                          <span className="material-icons ml-1 text-xs opacity-70 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                        </Link>
                      ) : (
                        <p className="font-semibold text-gray-200">{video.channelTitle}</p>
                      )}
                      <p className="text-sm text-gray-400">Educational Creator</p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm text-gray-400">
                    {video.viewCount && (
                      <div className="flex items-center space-x-1">
                        <span className="material-icons text-sm">visibility</span>
                        <span>{video.viewCount.toLocaleString()} views</span>
                      </div>
                    )}
                    {video.publishedAt && (
                      <div className="flex items-center space-x-1">
                        <span className="material-icons text-sm">schedule</span>
                        <span>
                          {new Date(video.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center space-x-3">
                  {session?.user ? (
                    <>
                      <button 
                        onClick={handleLikeVideo}
                        disabled={actionLoading === 'like'}
                        className={`flex items-center space-x-2 px-6 py-2 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl ${
                          interactions?.userInteractions.liked 
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                            : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700'
                        }`}
                      >
                        {actionLoading === 'like' ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="material-icons text-sm">
                            {interactions?.userInteractions.liked ? 'thumb_up' : 'thumb_up_off_alt'}
                          </span>
                        )}
                        <span className="font-medium">
                          {interactions?.userInteractions.liked ? 'Liked' : 'Like'}
                        </span>
                        {(interactions?.counts?.likes ?? 0) > 0 && (
                          <span className="text-xs bg-black/20 px-2 py-1 rounded-full">
                            {(interactions?.counts?.likes ?? 0).toLocaleString()}
                          </span>
                        )}
                      </button>
                      
                      <button 
                        onClick={handleAddToPlaylist}
                        className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-6 py-2 rounded-full transition-all duration-200 border border-gray-700"
                      >
                        <span className="material-icons text-sm">playlist_add</span>
                        <span className="font-medium">Save</span>
                      </button>
                      
                      <button 
                        onClick={handleShare}
                        className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-4 py-2 rounded-full transition-all duration-200 border border-gray-700"
                      >
                        <span className="material-icons text-sm">share</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/auth/signin"
                        className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-2 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <span className="material-icons text-sm">thumb_up</span>
                        <span className="font-medium">Like</span>
                        {video.likeCount && <span className="text-xs">({video.likeCount.toLocaleString()})</span>}
                      </Link>
                      <Link
                        href="/auth/signin"
                        className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-6 py-2 rounded-full transition-all duration-200 border border-gray-700"
                      >
                        <span className="material-icons text-sm">playlist_add</span>
                        <span className="font-medium">Save</span>
                      </Link>
                      <button 
                        onClick={handleShare}
                        className="flex items-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 px-4 py-2 rounded-full transition-all duration-200 border border-gray-700"
                      >
                        <span className="material-icons text-sm">share</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description section like YouTube */}
              {video.description && (
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      {video.viewCount && (
                        <span>{video.viewCount.toLocaleString()} views</span>
                      )}
                      {video.publishedAt && (
                        <span>
                          {new Date(video.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-300 text-sm leading-relaxed">
                    <div className="whitespace-pre-wrap">
                      {video.description.length > 300 ? (
                        <div>
                          <div className={`transition-all duration-300 ${isDescriptionExpanded ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                            <div 
                              className="whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: convertUrlsToLinks(video.description.substring(0, 300))
                              }}
                            />
                            <span className="text-gray-500">...</span>
                          </div>
                          <div className={`transition-all duration-300 ${isDescriptionExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                            <div 
                              className="whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: convertUrlsToLinks(video.description)
                              }}
                            />
                          </div>
                          <button 
                            className="text-blue-400 hover:text-blue-300 font-medium mt-3 text-sm transition-all duration-200 flex items-center space-x-1 px-3 py-1 rounded-md hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 disabled:opacity-70"
                            onClick={handleDescriptionToggle}
                            disabled={descriptionLoading}
                          >
                            {descriptionLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
                                <span className="material-icons text-sm transition-transform duration-200" style={{
                                  transform: isDescriptionExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                }}>
                                  expand_more
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: convertUrlsToLinks(video.description)
                          }}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Tags if available */}
                  {video.tags && video.tags.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700/30">
                      <div className="flex flex-wrap gap-2">
                        {video.tags.slice(0, 10).map((tag, index) => (
                          <span 
                            key={index}
                            className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                          >
                            #{tag}
                          </span>
                        ))}
                        {video.tags.length > 10 && (
                          <span className="text-gray-500 text-xs px-3 py-1">
                            +{video.tags.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Features Panel */}
            <div className="bg-gray-900/80 backdrop-blur-lg rounded-3xl border border-gray-700/40 shadow-2xl mb-6 overflow-hidden">
              <div className="grid grid-cols-5 border-b border-gray-700/30">
                {[
                  { id: 'summary', label: 'Summary', icon: 'auto_awesome', color: 'purple' },
                  { id: 'comments', label: 'Comments', icon: 'comment', color: 'blue' },
                  { id: 'quiz', label: 'Quiz', icon: 'quiz', color: 'green' },
                  { id: 'notes', label: 'Notes', icon: 'note', color: 'orange' },
                  { id: 'handwritten', label: 'Study', icon: 'edit_note', color: 'pink' }
                ].map((tab) => {
                  const getTabClasses = () => {
                    if (activeTab !== tab.id) {
                      return 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                    }
                    
                    switch (tab.color) {
                      case 'purple':
                        return 'text-purple-400 bg-gradient-to-b from-purple-500/20 to-transparent'
                      case 'blue':
                        return 'text-blue-400 bg-gradient-to-b from-blue-500/20 to-transparent'
                      case 'green':
                        return 'text-green-400 bg-gradient-to-b from-green-500/20 to-transparent'
                      case 'orange':
                        return 'text-orange-400 bg-gradient-to-b from-orange-500/20 to-transparent'
                      case 'pink':
                        return 'text-pink-400 bg-gradient-to-b from-pink-500/20 to-transparent'
                      default:
                        return 'text-gray-400'
                    }
                  }

                  const getIconClasses = () => {
                    if (activeTab !== tab.id) {
                      return 'bg-gray-800/50 group-hover:bg-gray-700/50'
                    }
                    
                    switch (tab.color) {
                      case 'purple':
                        return 'bg-purple-500/20 shadow-lg shadow-purple-500/20'
                      case 'blue':
                        return 'bg-blue-500/20 shadow-lg shadow-blue-500/20'
                      case 'green':
                        return 'bg-green-500/20 shadow-lg shadow-green-500/20'
                      case 'orange':
                        return 'bg-orange-500/20 shadow-lg shadow-orange-500/20'
                      case 'pink':
                        return 'bg-pink-500/20 shadow-lg shadow-pink-500/20'
                      default:
                        return 'bg-gray-800/50'
                    }
                  }

                  const getUnderlineClasses = () => {
                    switch (tab.color) {
                      case 'purple':
                        return 'bg-gradient-to-r from-purple-400 to-purple-600'
                      case 'blue':
                        return 'bg-gradient-to-r from-blue-400 to-blue-600'
                      case 'green':
                        return 'bg-gradient-to-r from-green-400 to-green-600'
                      case 'orange':
                        return 'bg-gradient-to-r from-orange-400 to-orange-600'
                      case 'pink':
                        return 'bg-gradient-to-r from-pink-400 to-pink-600'
                      default:
                        return 'bg-gradient-to-r from-gray-400 to-gray-600'
                    }
                  }

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex flex-col items-center justify-center py-4 px-2 text-xs font-medium transition-all duration-300 group ${getTabClasses()}`}
                    >
                      <div className={`p-2 rounded-xl mb-1 transition-all duration-300 ${getIconClasses()}`}>
                        <span className="material-icons text-base">{tab.icon}</span>
                      </div>
                      <span className="text-xs font-medium">{tab.label}</span>
                      {activeTab === tab.id && (
                        <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${getUnderlineClasses()}`} />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="p-6">{/* AI content will go here */}
                {/* AI Summary Tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <span className="material-icons text-purple-400 text-sm">auto_awesome</span>
                        </div>
                        <h3 className="font-semibold text-gray-200">AI Summary</h3>
                      </div>
                      {!summary && (
                        <button
                          onClick={fetchSummary}
                          disabled={summaryLoading}
                          className="group relative px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/25 disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-2">
                            {summaryLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-icons text-sm">psychology</span>
                            )}
                            <span>{summaryLoading ? 'Generating...' : 'Generate'}</span>
                          </div>
                        </button>
                      )}
                    </div>
                    {summary ? (
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
                        <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                          <span className="material-icons text-purple-400 text-2xl">auto_awesome</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">AI-Powered Video Summary</p>
                        <p className="text-gray-500 text-xs">Get key insights and main points from this video</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Tab */}
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <span className="material-icons text-blue-400 text-sm">comment</span>
                        </div>
                        <h3 className="font-semibold text-gray-200">Comments</h3>
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-medium">
                          {comments.length}
                        </span>
                      </div>
                      <button
                        onClick={fetchComments}
                        disabled={commentsLoading}
                        className="group relative px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
                      >
                        <div className="flex items-center space-x-2">
                          {commentsLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <span className="material-icons text-sm">refresh</span>
                          )}
                          <span>{commentsLoading ? 'Loading...' : 'Load'}</span>
                        </div>
                      </button>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-800/30 rounded-xl p-3 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200">
                          <div className="flex space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              {comment.authorAvatar ? (
                                <img src={comment.authorAvatar} alt="" className="w-8 h-8 rounded-full" />
                              ) : (
                                <span className="text-lg font-bold text-white">
                                  {comment.author.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-300 text-sm truncate">
                                  {comment.author}
                                </span>
                                <span className="text-gray-500 text-xs bg-gray-800/50 px-2 py-0.5 rounded-full">
                                  {comment.published}
                                </span>
                              </div>
                              <p className="text-gray-400 text-sm leading-relaxed">{comment.text}</p>
                              {comment.likes > 0 && (
                                <div className="flex items-center space-x-1 mt-2">
                                  <div className="flex items-center space-x-1 bg-gray-800/50 px-2 py-1 rounded-full">
                                    <span className="material-icons text-gray-500 text-xs">thumb_up</span>
                                    <span className="text-gray-500 text-xs font-medium">{comment.likes}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && !commentsLoading && (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <span className="material-icons text-blue-400 text-2xl">comment</span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">No Comments Yet</p>
                          <p className="text-gray-500 text-xs">Click "Load" to fetch video comments</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quiz Tab */}
                {activeTab === 'quiz' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <span className="material-icons text-green-400 text-sm">quiz</span>
                        </div>
                        <h3 className="font-semibold text-gray-200">Interactive Quiz</h3>
                        {quiz && (
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                            {quiz.questions.length} questions
                          </span>
                        )}
                      </div>
                      {!quiz && (
                        <button
                          onClick={fetchQuiz}
                          disabled={quizLoading}
                          className="group relative px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 disabled:opacity-50"
                        >
                          <div className="flex items-center space-x-2">
                            {quizLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <span className="material-icons text-sm">psychology</span>
                            )}
                            <span>{quizLoading ? 'Creating Quiz...' : 'Generate Quiz'}</span>
                          </div>
                        </button>
                      )}
                    </div>
                    
                    {quizLoading && (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Creating Your Quiz</p>
                        <p className="text-gray-500 text-xs">Analyzing video content to generate relevant questions...</p>
                      </div>
                    )}
                    
                    {quiz && quiz.questions && quiz.questions.length > 0 ? (
                      <div className="space-y-6 max-h-96 overflow-y-auto custom-scrollbar">
                        {!showResults && (
                          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-4">
                            <div className="flex items-center space-x-2 text-green-400 mb-2">
                              <span className="material-icons text-sm">info</span>
                              <span className="text-sm font-medium">Quiz Instructions</span>
                            </div>
                            <p className="text-gray-300 text-xs mb-2">
                              Test your understanding with these {quiz.questions.length} questions. Select your answers and click "Submit Quiz" to see results.
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-400">
                                Progress: {Object.keys(selectedAnswers).length}/{quiz.questions.length} answered
                              </span>
                              {isQuizComplete && (
                                <button
                                  onClick={submitQuiz}
                                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  Submit Quiz
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {showResults && (
                          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2 text-green-400 mb-2">
                                  <span className="material-icons text-sm">school</span>
                                  <span className="text-sm font-medium">Quiz Results</span>
                                </div>
                                <p className="text-gray-300 text-xs">
                                  You scored {quizScore} out of {quiz.questions.length} questions correct! 
                                  ({Math.round((quizScore / quiz.questions.length) * 100)}%)
                                </p>
                              </div>
                              <button
                                onClick={resetQuiz}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                Try Again
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {quiz.questions.map((q, index) => {
                          const userAnswer = selectedAnswers[index]
                          const isAnswered = userAnswer !== undefined
                          const isCorrect = userAnswer === q.correct
                          
                          return (
                            <div key={index} className="bg-gradient-to-br from-green-500/5 to-green-600/5 border border-green-500/20 rounded-xl p-5">
                              <div className="flex items-start space-x-3 mb-4">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  showResults ? (isCorrect ? 'bg-green-500/20' : 'bg-red-500/20') : 'bg-green-500/20'
                                }`}>
                                  {showResults ? (
                                    isCorrect ? (
                                      <span className="material-icons text-green-400 text-sm">check</span>
                                    ) : (
                                      <span className="material-icons text-red-400 text-sm">close</span>
                                    )
                                  ) : (
                                    <span className="text-green-400 text-sm font-bold">{index + 1}</span>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-200 text-sm leading-relaxed mb-3">{q.question}</p>
                                  
                                  <div className="space-y-2">
                                    {q.options.map((option, optIndex) => {
                                      const isSelected = userAnswer === optIndex
                                      const isCorrectAnswer = optIndex === q.correct
                                      
                                      let optionClasses = "text-sm p-3 rounded-lg border transition-all duration-200 cursor-pointer "
                                      
                                      if (showResults) {
                                        if (isCorrectAnswer) {
                                          optionClasses += "bg-green-500/20 border-green-500/40 text-green-300 ring-1 ring-green-500/30"
                                        } else if (isSelected && !isCorrectAnswer) {
                                          optionClasses += "bg-red-500/20 border-red-500/40 text-red-300 ring-1 ring-red-500/30"
                                        } else {
                                          optionClasses += "bg-gray-800/40 border-gray-700/40 text-gray-400"
                                        }
                                      } else {
                                        if (isSelected) {
                                          optionClasses += "bg-blue-500/20 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30"
                                        } else {
                                          optionClasses += "bg-gray-800/40 border-gray-700/40 text-gray-300 hover:border-gray-600/60 hover:bg-gray-700/30"
                                        }
                                      }

                                      return (
                                        <div
                                          key={optIndex}
                                          className={optionClasses}
                                          onClick={() => handleAnswerSelect(index, optIndex)}
                                        >
                                          <div className="flex items-center space-x-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                              showResults 
                                                ? isCorrectAnswer 
                                                  ? 'border-green-400 bg-green-400' 
                                                  : isSelected && !isCorrectAnswer
                                                    ? 'border-red-400 bg-red-400'
                                                    : 'border-gray-500 bg-transparent'
                                                : isSelected 
                                                  ? 'border-blue-400 bg-blue-400' 
                                                  : 'border-gray-500 bg-transparent'
                                            }`}>
                                              {showResults ? (
                                                isCorrectAnswer ? (
                                                  <span className="material-icons text-white text-xs">check</span>
                                                ) : isSelected && !isCorrectAnswer ? (
                                                  <span className="material-icons text-white text-xs">close</span>
                                                ) : null
                                              ) : isSelected ? (
                                                <span className="material-icons text-white text-xs">check</span>
                                              ) : null}
                                            </div>
                                            <span className="flex-1">{option}</span>
                                            {showResults && isCorrectAnswer && (
                                              <span className="material-icons text-green-400 text-sm">verified</span>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  
                                  {showResults && q.explanation && (
                                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                      <div className="flex items-start space-x-2">
                                        <span className="material-icons text-blue-400 text-sm mt-0.5">lightbulb</span>
                                        <div>
                                          <p className="text-blue-300 text-xs font-medium mb-1">Explanation</p>
                                          <p className="text-blue-200 text-xs leading-relaxed">{q.explanation}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        
                        {showResults && (
                          <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center space-x-2 text-green-400 mb-2">
                              <span className="material-icons text-sm">school</span>
                              <span className="font-medium text-sm">Quiz Complete!</span>
                            </div>
                            <p className="text-gray-400 text-xs">
                              {quizScore === quiz.questions.length 
                                ? "Perfect score! You've mastered this content! 🎉" 
                                : quizScore >= quiz.questions.length * 0.7 
                                  ? "Great job! You have a solid understanding of the material! 👏"
                                  : "Good effort! Review the explanations and try again to improve your score! 📚"
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    ) : quiz && quiz.questions && quiz.questions.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                          <span className="material-icons text-orange-400 text-2xl">warning</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Quiz Generation Failed</p>
                        <p className="text-gray-500 text-xs mb-4">Unable to create questions for this video content.</p>
                        <button
                          onClick={fetchQuiz}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Try Again
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 flex items-center justify-center">
                          <span className="material-icons text-green-400 text-2xl">quiz</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Interactive Learning Quiz</p>
                        <p className="text-gray-500 text-xs">Test your understanding with AI-generated questions</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <span className="material-icons text-orange-400 text-sm">note</span>
                        </div>
                        <h3 className="font-semibold text-gray-200">AI Notes</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {notes && (
                          <button
                            onClick={generateNotesPDF}
                            className="group relative px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/25"
                          >
                            <div className="flex items-center space-x-1">
                              <span className="material-icons text-sm">download</span>
                              <span>PDF</span>
                            </div>
                          </button>
                        )}
                        {!notes && (
                          <button
                            onClick={fetchNotes}
                            disabled={notesLoading}
                            className="group relative px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-orange-500/25 disabled:opacity-50"
                          >
                            <div className="flex items-center space-x-2">
                              {notesLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-icons text-sm">edit_note</span>
                              )}
                              <span>{notesLoading ? 'Generating...' : 'Generate'}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                    {notes ? (
                      <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
                          <h4 className="font-semibold text-orange-300 text-sm mb-3 flex items-center">
                            <span className="material-icons text-sm mr-2">article</span>
                            {notes.title || 'Study Notes'}
                          </h4>
                          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {notes.content || 'No content available'}
                          </div>
                        </div>
                        
                        {/* Diagrams Section */}
                        {notes.diagrams && notes.diagrams.length > 0 && (
                          <div className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
                            <h4 className="font-semibold text-orange-300 text-sm mb-3 flex items-center">
                              <span className="material-icons text-sm mr-2">insights</span>
                              Visual Diagrams
                            </h4>
                            <div className="space-y-4">
                              {notes.diagrams.map((diagram, index) => (
                                <div key={index} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/30">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-orange-300 font-medium text-sm">{diagram.title}</h5>
                                    <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">
                                      {diagram.type}
                                    </span>
                                  </div>
                                  <p className="text-gray-400 text-xs mb-3">{diagram.description}</p>
                                  {diagram.asciiArt && (
                                    <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/40">
                                      <pre className="text-xs text-gray-300 font-mono whitespace-pre overflow-x-auto">
                                        {diagram.asciiArt}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Key Points Section - Fixed visibility */}
                        {notes.keyPoints && Array.isArray(notes.keyPoints) && notes.keyPoints.length > 0 ? (
                          <div className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
                            <h4 className="font-semibold text-orange-300 text-sm mb-3 flex items-center">
                              <span className="material-icons text-sm mr-2">star</span>
                              Key Points ({notes.keyPoints.length})
                            </h4>
                            <ul className="space-y-2">
                              {notes.keyPoints.map((point, index) => (
                                <li key={index} className="text-gray-300 text-sm flex items-start">
                                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                  </div>
                                  <span className="leading-relaxed">{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
                            <h4 className="font-semibold text-orange-300 text-sm mb-3 flex items-center">
                              <span className="material-icons text-sm mr-2">star</span>
                              Key Points
                            </h4>
                            <p className="text-gray-400 text-sm">
                              {notes.keyPoints ? 
                                `Debug: keyPoints exists but is ${typeof notes.keyPoints}: ${JSON.stringify(notes.keyPoints)}` : 
                                'No key points available'}
                            </p>
                          </div>
                        )}
                        
                        {/* Visual Elements Section */}
                        {notes.visualElements && notes.visualElements.length > 0 && (
                          <div className="bg-gradient-to-br from-orange-500/5 to-orange-600/5 border border-orange-500/20 rounded-xl p-4">
                            <h4 className="font-semibold text-orange-300 text-sm mb-3 flex items-center">
                              <span className="material-icons text-sm mr-2">brush</span>
                              Visual Elements
                            </h4>
                            <div className="space-y-2">
                              {notes.visualElements.map((element, index) => (
                                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-800/30 rounded-lg">
                                  <span className={`material-icons text-sm ${
                                    element.type === 'highlight' ? 'text-yellow-400' :
                                    element.type === 'star' ? 'text-orange-400' :
                                    element.type === 'box' ? 'text-blue-400' :
                                    element.type === 'arrow' ? 'text-green-400' :
                                    'text-purple-400'
                                  }`}>
                                    {element.type === 'highlight' ? 'highlight' :
                                     element.type === 'star' ? 'star' :
                                     element.type === 'box' ? 'crop_square' :
                                     element.type === 'arrow' ? 'arrow_forward' :
                                     'format_underlined'}
                                  </span>
                                  <span className="text-gray-300 text-sm">{element.content}</span>
                                  <span className="text-xs text-gray-500 ml-auto">{element.position}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                          <span className="material-icons text-orange-400 text-2xl">note</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Enhanced Study Notes</p>
                        <p className="text-gray-500 text-xs">Get organized notes with diagrams, key points, and visual elements</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Handwritten Notes Tab */}
                {activeTab === 'handwritten' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                          <span className="material-icons text-pink-400 text-sm">edit_note</span>
                        </div>
                        <h3 className="font-semibold text-gray-200">Study Notes</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {handwrittenNotes && (
                          <button
                            onClick={generateHandwrittenNotesPDF}
                            className="group relative px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-green-500/25"
                          >
                            <div className="flex items-center space-x-1">
                              <span className="material-icons text-sm">download</span>
                              <span>PDF</span>
                            </div>
                          </button>
                        )}
                        {!handwrittenNotes && (
                          <button
                            onClick={fetchHandwrittenNotes}
                            disabled={handwrittenNotesLoading}
                            className="group relative px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-pink-500/25 disabled:opacity-50"
                          >
                            <div className="flex items-center space-x-2">
                              {handwrittenNotesLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-icons text-sm">create</span>
                              )}
                              <span>{handwrittenNotesLoading ? 'Creating...' : 'Create'}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                    {handwrittenNotes ? (
                      <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-pink-300 text-sm">{handwrittenNotes.title || 'Study Notes'}</h4>
                            <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded-full">{handwrittenNotes.date || 'Today'}</span>
                          </div>
                          <p className="text-xs text-pink-400 font-medium">📚 Subject: {handwrittenNotes.subject || 'General'}</p>
                        </div>
                        
                        {handwrittenNotes.sections && handwrittenNotes.sections.length > 0 && handwrittenNotes.sections.map((section, index) => (
                          <div key={index} className="bg-gradient-to-br from-pink-500/5 to-pink-600/5 border border-pink-500/20 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-semibold text-pink-300 text-sm">{section.heading || `Section ${index + 1}`}</h5>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                section.importance === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                section.importance === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                                'bg-green-500/20 text-green-400 border border-green-500/30'
                              }`}>
                                {section.importance || 'medium'}
                              </span>
                            </div>
                            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                              {section.content || 'No content available'}
                            </div>
                            {section.hasVisual && (
                              <div className="mt-3 flex items-center space-x-2 text-pink-400">
                                <span className="material-icons text-sm">visibility</span>
                                <span className="text-xs font-medium">Visual: {section.visualType || 'diagram'}</span>
                              </div>
                            )}
                          </div>
                        ))}

                        {handwrittenNotes.diagrams && handwrittenNotes.diagrams.length > 0 && (
                          <div className="bg-gradient-to-br from-pink-500/5 to-pink-600/5 border border-pink-500/20 rounded-xl p-4">
                            <h5 className="font-semibold text-pink-300 text-sm mb-3 flex items-center">
                              <span className="material-icons text-sm mr-2">insights</span>
                              Diagrams & Visuals
                            </h5>
                            <div className="space-y-3">
                              {handwrittenNotes.diagrams.map((diagram, index) => (
                                <div key={index} className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                                  <p className="text-sm font-medium text-pink-300 mb-1">{diagram.title || `Diagram ${index + 1}`}</p>
                                  <p className="text-xs text-gray-400 mb-2">{diagram.description || 'Visual representation'}</p>
                                  {diagram.asciiArt && (
                                    <pre className="text-xs text-gray-300 bg-gray-900/50 p-3 rounded-lg overflow-x-auto border border-gray-700/50">
                                      {diagram.asciiArt}
                                    </pre>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl p-4">
                          <h5 className="font-semibold text-pink-300 text-sm mb-3 flex items-center">
                            <span className="material-icons text-sm mr-2">summarize</span>
                            Summary
                          </h5>
                          <p className="text-gray-300 text-sm leading-relaxed">{handwrittenNotes.summary || 'No summary available'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-pink-500/10 flex items-center justify-center">
                          <span className="material-icons text-pink-400 text-2xl">edit_note</span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Handwritten Study Notes</p>
                        <p className="text-gray-500 text-xs">Generate detailed study notes with diagrams and visuals</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Chapters section only */}
            {video.chapters && video.chapters.length > 0 && (
              <div className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-4 border border-gray-800/30 shadow-lg">
                <h3 className="font-semibold mb-3 flex items-center">
                  <span className="material-icons text-green-400 mr-2">bookmark</span>
                  Chapters
                </h3>
                <div className="space-y-2">
                  {video.chapters.map((chapter, index) => (
                    <button
                      key={index}
                      className="w-full text-left p-3 hover:bg-gray-700/50 rounded-lg transition-all duration-200 border border-gray-700/30 hover:border-gray-600/50"
                      onClick={() => {
                        // Jump to specific time in video
                        const iframe = document.querySelector('iframe') as HTMLIFrameElement
                        if (iframe) {
                          const currentSrc = iframe.src
                          const url = new URL(currentSrc)
                          url.searchParams.set('t', chapter.start.toString())
                          iframe.src = url.toString()
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300 font-medium">{chapter.title}</span>
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">
                          {Math.floor(chapter.start / 60)}:{(chapter.start % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar for Key Points */}
          <div className="xl:col-span-1">
            {/* Show key points from AI notes if available, otherwise from video data (which now includes auto-generated points) */}
            {((notes?.keyPoints && Array.isArray(notes.keyPoints) && notes.keyPoints.length > 0) || 
              (video.keyPoints && video.keyPoints.length > 0)) && (
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 shadow-xl sticky top-24">
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <span className="material-icons text-blue-400 mr-2">list</span>
                  Key Points
                  {notes?.keyPoints && Array.isArray(notes.keyPoints) && notes.keyPoints.length > 0 ? (
                    <span className="ml-2 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full font-medium">
                      AI Notes
                    </span>
                  ) : (
                    <span className="ml-2 bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-medium">
                      Auto Generated
                    </span>
                  )}
                </h3>
                <ul className="space-y-3">
                  {/* Prioritize AI-generated notes keyPoints over video keyPoints */}
                  {(notes?.keyPoints && Array.isArray(notes.keyPoints) && notes.keyPoints.length > 0 ? 
                    notes.keyPoints : video.keyPoints || []).map((point, index) => (
                    <li key={index} className="text-gray-300 text-sm flex items-start leading-relaxed">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      </div>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Loading state for key points generation */}
            {loading && (
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 shadow-xl sticky top-24">
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <span className="material-icons text-blue-400 mr-2">list</span>
                  Key Points
                </h3>
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mr-3"></div>
                  <span className="text-gray-400 text-sm">Generating key points...</span>
                </div>
              </div>
            )}
            
            {/* Fallback message when video is loaded but no key points are available */}
            {!loading && video && !((notes?.keyPoints && Array.isArray(notes.keyPoints) && notes.keyPoints.length > 0) || 
              (video.keyPoints && video.keyPoints.length > 0)) && (
              <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-800/30 shadow-xl sticky top-24">
                <h3 className="font-semibold text-lg mb-4 flex items-center">
                  <span className="material-icons text-yellow-400 mr-2">info</span>
                  Key Points
                </h3>
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    <span className="material-icons text-yellow-400">lightbulb</span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">Key points are being processed</p>
                  <p className="text-gray-500 text-xs mb-4">Try generating AI notes for detailed insights</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add to Playlist</h3>
                <button 
                  onClick={() => setShowPlaylistModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-icons text-gray-400">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Create new playlist */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Create New Playlist</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    placeholder="Playlist title"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                  />
                  <button
                    onClick={handleCreatePlaylist}
                    disabled={!newPlaylistTitle.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>

              {/* Existing playlists */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Your Playlists</h4>
                {playlists.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No playlists yet. Create one above!</p>
                ) : (
                  playlists.map(playlist => (
                    <div
                      key={playlist.id}
                      className="flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg border border-gray-700/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h5 className="font-medium text-white text-sm">{playlist.title}</h5>
                        <p className="text-xs text-gray-400">{playlist.videoCount} videos</p>
                      </div>
                      <button
                        onClick={() => handlePlaylistToggle(playlist.id, !playlist.containsVideo)}
                        className={`p-2 rounded-lg transition-colors ${
                          playlist.containsVideo
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        <span className="material-icons text-sm">
                          {playlist.containsVideo ? 'check' : 'add'}
                        </span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Share Video</h3>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <span className="material-icons text-gray-400">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Video preview */}
              <div className="flex space-x-3 mb-6 p-3 bg-gray-800/30 rounded-lg">
                {shareData.thumbnail && (
                  <img 
                    src={shareData.thumbnail} 
                    alt={shareData.title}
                    className="w-16 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white text-sm truncate">{shareData.title}</h4>
                  <p className="text-xs text-gray-400">{shareData.metadata.channelTitle}</p>
                </div>
              </div>

              {/* Copy link */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Copy Link</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareData.url}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                  </button>
                </div>
              </div>

              {/* Social sharing */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Share on Social Media</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { platform: 'twitter', icon: '🐦', label: 'Twitter', color: 'hover:bg-blue-600' },
                    { platform: 'facebook', icon: '👤', label: 'Facebook', color: 'hover:bg-blue-700' },
                    { platform: 'linkedin', icon: '💼', label: 'LinkedIn', color: 'hover:bg-blue-800' },
                    { platform: 'whatsapp', icon: '💬', label: 'WhatsApp', color: 'hover:bg-green-600' },
                    { platform: 'telegram', icon: '✈️', label: 'Telegram', color: 'hover:bg-blue-500' },
                    { platform: 'email', icon: '📧', label: 'Email', color: 'hover:bg-gray-600' },
                  ].map(({ platform, icon, label, color }) => (
                    <button
                      key={platform}
                      onClick={() => handleSocialShare(platform)}
                      className={`p-3 bg-gray-800 ${color} rounded-lg transition-colors text-center group`}
                      title={`Share on ${label}`}
                    >
                      <div className="text-xl mb-1">{icon}</div>
                      <div className="text-xs text-gray-400 group-hover:text-white">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
