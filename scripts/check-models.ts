async function listAvailableModels() {
  const apiKey = process.env.GOOGLE_API_KEY
  
  if (!apiKey) {
    console.log('❌ No Google API key found')
    return
  }

  try {
    console.log('🔍 Fetching available models...')
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Error fetching models:', response.status, error)
      return
    }

    const data = await response.json()
    console.log('📋 Available models:')
    
    if (data.models) {
      data.models.forEach((model: any) => {
        console.log(`  • ${model.name}`)
        if (model.supportedGenerationMethods) {
          console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`)
        }
      })
    }
  } catch (error) {
    console.error('💥 Error:', error)
  }
}

listAvailableModels()
