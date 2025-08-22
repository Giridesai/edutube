# 🚀 Netlify Deployment Checklist for EduTube

## ✅ Pre-Deployment Checklist

### 1. Database Setup (REQUIRED)
- [ ] Choose production database: PlanetScale (MySQL) or Supabase (PostgreSQL)
- [ ] Create database and get connection string
- [ ] Update Prisma schema provider if needed (see docs/PRODUCTION_DATABASE.md)

### 2. Environment Variables Setup
Copy these to Netlify Dashboard → Site Settings → Environment Variables:

```bash
# Database
DATABASE_URL="your-production-database-connection-string"

# Authentication
NEXTAUTH_URL="https://your-site-name.netlify.app"
NEXTAUTH_SECRET="H6rzP9eimoeAC3BhdCUqM8DAUk0Wx8usVrL/Fiy+XcI="

# YouTube API
YOUTUBE_API_KEYS="your-youtube-api-keys-comma-separated"
YOUTUBE_API_KEY="your-fallback-youtube-api-key"

# Google AI
GOOGLE_API_KEYS="your-google-ai-keys-comma-separated"
GOOGLE_API_KEY="your-fallback-google-ai-key"
GOOGLE_AI_MODEL="gemini-1.5-flash"

# Environment
NODE_ENV="production"
```

### 3. Netlify Build Settings
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: 18 (auto-configured via netlify.toml)

## 🚀 Deployment Steps

### Step 1: Deploy via Netlify Dashboard
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `edutube` repository
4. Configure build settings (use values above)
5. Add environment variables before first deploy

### Step 2: First Deployment
1. Click "Deploy site"
2. Wait for build to complete (~5-10 minutes)
3. Note your site URL (e.g., `https://amazing-site-name.netlify.app`)

### Step 3: Update Environment Variables
1. Go to Site Settings → Environment Variables
2. Update `NEXTAUTH_URL` with your actual Netlify URL
3. Trigger a new deploy

### Step 4: Custom Domain (Optional)
1. Go to Site Settings → Domain management
2. Add custom domain if desired
3. Update `NEXTAUTH_URL` if using custom domain

## 🔧 Build Process Explained

Your project's build process:
1. `prisma generate` - Generates Prisma client
2. `prisma db push` - Applies schema to production database
3. `next build` - Builds the Next.js application

## 🧪 Post-Deployment Testing

After deployment, test these features:
- [ ] Homepage loads correctly
- [ ] User registration/login works
- [ ] YouTube video search works
- [ ] AI video summaries generate
- [ ] Quiz generation works
- [ ] Database connections are stable

## 🛠️ Troubleshooting

### Common Issues:

1. **Build Fails**
   - Check build logs in Netlify
   - Ensure all environment variables are set
   - Verify database connection

2. **Database Connection Issues**
   - Ensure DATABASE_URL is correct
   - Check database is accessible from external connections
   - Verify Prisma schema matches database provider

3. **NextAuth Issues**
   - Ensure NEXTAUTH_URL matches exact domain
   - Verify NEXTAUTH_SECRET is set
   - Check callback URLs

4. **API Rate Limits**
   - Monitor YouTube API quotas
   - Ensure API keys are working
   - Check API key rotation setup

## 📞 Support

If you encounter issues:
1. Check Netlify build logs
2. Review environment variables
3. Test API keys locally
4. Check database connectivity

Your project is now ready for production! 🎉
