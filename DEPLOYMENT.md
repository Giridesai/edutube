# Netlify Deployment Checklist

## Before Deployment:

### 1. Environment Variables (Set in Netlify Dashboard)
- [ ] `DATABASE_URL` - Set to your production database (PlanetScale, Supabase, etc.)
- [ ] `NEXTAUTH_URL` - Set to `https://your-app-name.netlify.app`
- [ ] `NEXTAUTH_SECRET` - Generate new production secret (32+ chars)
- [ ] `YOUTUBE_API_KEYS` - Your YouTube API keys
- [ ] `GOOGLE_API_KEYS` - Your Google AI API keys
- [ ] `NODE_ENV` - Set to `production`

### 2. Database Setup
- [ ] Migrate to a production database service (not SQLite)
- [ ] Run database migrations
- [ ] Seed production data if needed

### 3. Domain & URLs
- [ ] Update `NEXTAUTH_URL` after getting Netlify domain
- [ ] Configure custom domain if desired
- [ ] Update any hardcoded localhost URLs

### 4. Security
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Review API key security
- [ ] Enable HTTPS redirects

## Netlify Setup Steps:

1. **Connect Repository:**
   - Go to Netlify Dashboard
   - Click "New site from Git"
   - Connect your GitHub/GitLab repository

2. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: 18

3. **Environment Variables:**
   - Go to Site Settings > Environment Variables
   - Add all variables from `.env.production.template`

4. **Deploy:**
   - Click "Deploy site"
   - Wait for build to complete
   - Update `NEXTAUTH_URL` with actual domain
   - Redeploy

## Database Options for Production:

### Option 1: PlanetScale (Recommended)
```bash
# Free tier available
DATABASE_URL="mysql://username:password@host/database?sslaccept=strict"
```

### Option 2: Supabase
```bash
# Free tier available
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Option 3: Railway
```bash
# Good for PostgreSQL
DATABASE_URL="postgresql://user:password@host:5432/database"
```

## Post-Deployment Testing:
- [ ] Test authentication (sign up/in)
- [ ] Test video loading
- [ ] Test AI features
- [ ] Check all API endpoints
- [ ] Verify environment variables are working

## Common Issues & Solutions:

1. **Build Failures:**
   - Ensure all dependencies are in package.json
   - Check Node version compatibility
   - Verify environment variables

2. **Database Connection:**
   - Use production database, not SQLite
   - Run migrations on production database
   - Check connection string format

3. **NextAuth Issues:**
   - Ensure NEXTAUTH_URL matches exact domain
   - Use strong NEXTAUTH_SECRET
   - Check callback URLs

4. **API Rate Limits:**
   - Monitor YouTube API quotas
   - Implement proper error handling
   - Consider API key rotation
