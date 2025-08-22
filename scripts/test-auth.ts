// Test script to check NextAuth configuration
import { authOptions } from '../lib/auth'

console.log('Auth options loaded successfully')
console.log('Secret present:', !!process.env.NEXTAUTH_SECRET)
console.log('URL present:', !!process.env.NEXTAUTH_URL)
console.log('URL value:', process.env.NEXTAUTH_URL)

export default function testAuth() {
  return authOptions
}
