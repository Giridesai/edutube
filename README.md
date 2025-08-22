# EduTube

An AI-powered educational video platform that transforms YouTube videos into comprehensive learning experiences with automatic summaries, quiz generation, and interactive note-taking features.

## 🌟 Features

- **AI-Powered Video Summaries**: Automatically generate comprehensive summaries from YouTube videos using multiple AI services (Google AI, ChatGPT OSS)
- **Interactive Quiz Generation**: Create educational quizzes based on video content to test understanding
- **Smart Note-Taking**: AI-assisted note generation from handwritten content and video transcripts
- **Multi-API Key Support**: Robust API key rotation system for YouTube and Google AI services to avoid quota limits
- **User Authentication**: Secure sign-up and sign-in functionality with NextAuth.js
- **Video Library Management**: Personal library, playlists, and subscription management
- **Watch History**: Track and manage viewing history
- **Channel Information**: Detailed channel pages with subscriber counts and video listings
- **Responsive Design**: Modern, mobile-first UI built with Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js
- **AI Services**: 
  - Google AI (Gemini 1.5)
  - ChatGPT OSS (Ollama/local or hosted)
  - Visual generation services
- **APIs**: YouTube Data API v3
- **Deployment**: Netlify

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- YouTube Data API v3 keys
- Google AI API keys
- (Optional) ChatGPT OSS setup for local AI processing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Giridesai/edutube.git
   cd edutube
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.production.template .env.local
   ```
   
   Update `.env.local` with your API keys:
   ```bash
   # Database
   DATABASE_URL="file:./dev.db"
   
   # YouTube API Keys (comma-separated for rotation)
   YOUTUBE_API_KEYS="your-key-1,your-key-2,your-key-3"
   YOUTUBE_API_KEY="your-fallback-key"
   
   # Google AI Keys (comma-separated for rotation)
   GOOGLE_API_KEYS="your-google-ai-key"
   GOOGLE_API_KEY="your-google-ai-key"
   GOOGLE_AI_MODEL="gemini-1.5-flash"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📖 API Documentation

### Core Endpoints

- `GET /api/youtube/search` - Search YouTube videos
- `GET /api/youtube/video/[id]` - Get video details
- `POST /api/ai/video-summary` - Generate AI video summary
- `POST /api/ai/quiz` - Generate quiz from video content
- `POST /api/ai/notes` - Generate notes from content
- `GET /api/user/library` - User's video library
- `POST /api/user/playlists` - Manage playlists

### AI Services

The application supports multiple AI service providers:

- **Google AI Service**: Uses Gemini models for text generation
- **ChatGPT OSS Service**: Local or hosted ChatGPT-compatible endpoints
- **Visual Generation Service**: For image-based content processing

## 🔧 Configuration

### Multi-API Key Setup

The application supports API key rotation to handle rate limits:

```bash
# Multiple keys separated by commas
YOUTUBE_API_KEYS="key1,key2,key3"
GOOGLE_API_KEYS="key1,key2,key3"
```

See [docs/MULTI_API_KEYS.md](docs/MULTI_API_KEYS.md) for detailed configuration.

### ChatGPT OSS Setup

For local AI processing:

```bash
# Run the setup script
./scripts/setup-chatgpt-oss.sh

# Or manually configure
CHATGPT_OSS_API_URL="http://localhost:11434/v1/chat/completions"
CHATGPT_OSS_MODEL="your-model-name"
```

## 📁 Project Structure

```
edutube/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   └── watch/             # Video watching interface
├── components/            # Reusable React components
├── lib/                   # Utility libraries and services
├── prisma/               # Database schema and migrations
├── scripts/              # Utility scripts
└── docs/                 # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube Data API for video content access
- Google AI for advanced language processing
- Next.js team for the excellent framework
- Prisma for database management
- Tailwind CSS for styling

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

Built with ❤️ for educational content creators and learners worldwide.
