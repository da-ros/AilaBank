import { NextRequest, NextResponse } from 'next/server'

// This endpoint uses Cloudflare Workers AI for speech-to-text
// You'll need to set up Cloudflare Workers AI or use OpenAI Whisper

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Option 1: Use Cloudflare Workers AI (if available)
    if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
      const cfResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          },
          body: audioFile,
        }
      )

      const result = await cfResponse.json()
      
      return NextResponse.json({
        text: result.result?.text || '',
        confidence: 0.95,
      })
    }

    // Option 2: Use OpenAI Whisper (fallback)
    if (process.env.OPENAI_API_KEY) {
      const openaiFormData = new FormData()
      openaiFormData.append('file', audioFile, 'audio.webm')
      openaiFormData.append('model', 'whisper-1')

      const openaiResponse = await fetch(
        'https://api.openai.com/v1/audio/transcriptions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: openaiFormData,
        }
      )

      const result = await openaiResponse.json()

      return NextResponse.json({
        text: result.text || '',
        confidence: 0.95,
      })
    }

    // Fallback: Mock response for development
    return NextResponse.json({
      text: 'Check my balance',
      confidence: 0.85,
      warning: 'Using mock STT - configure CLOUDFLARE_API_TOKEN or OPENAI_API_KEY',
    })

  } catch (error: any) {
    console.error('STT Error:', error)
    return NextResponse.json(
      { error: 'Speech-to-text failed', details: error.message },
      { status: 500 }
    )
  }
}
