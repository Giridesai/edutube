'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            EduTube
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            A distraction-free educational YouTube platform designed for focused learning and growth.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link
              href="/auth/signin"
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-transparent border border-purple-600 hover:bg-purple-600 text-purple-400 hover:text-white font-medium py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Create Account
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="material-icons text-white">subscriptions</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Smart Subscriptions</h3>
              <p className="text-gray-400 text-sm">
                Subscribe to educational channels and get personalized content recommendations based on your learning interests.
              </p>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="material-icons text-white">psychology</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">AI-Powered Learning</h3>
              <p className="text-gray-400 text-sm">
                Get AI-generated summaries, key points, and study notes for every video you watch.
              </p>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <span className="material-icons text-white">history</span>
              </div>
              <h3 className="text-lg font-semibold mb-3">Learning Progress</h3>
              <p className="text-gray-400 text-sm">
                Track your learning journey with watch history, progress tracking, and personalized playlists.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
