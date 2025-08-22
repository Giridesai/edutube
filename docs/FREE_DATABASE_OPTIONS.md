# Free Database Options for EduTube

## 🎯 Recommended Free Options

### 1. Supabase (PostgreSQL) ⭐ **BEST FREE OPTION**

**Free Tier:**
- 500MB database storage
- 5GB bandwidth
- 50,000 monthly active users
- No time limit!

**Setup:**
1. Go to [Supabase](https://supabase.com/)
2. Sign up with GitHub
3. Create new project
4. Get connection string from Settings → Database

**Connection String Format:**
```bash
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
```

### 2. Railway (PostgreSQL/MySQL) 

**Free Tier:**
- $5 free credit (lasts months for small apps)
- No storage limits while credit lasts
- Simple deployment

**Setup:**
1. Go to [Railway](https://railway.app/)
2. Sign up with GitHub
3. Deploy PostgreSQL from template
4. Get connection string from Variables tab

### 3. Neon (PostgreSQL)

**Free Tier:**
- 3GB storage
- 1 project
- No time limit

**Setup:**
1. Go to [Neon](https://neon.tech/)
2. Create account
3. Create database
4. Get connection string

### 4. Turso (SQLite-compatible)

**Free Tier:**
- 9GB storage
- 1 billion row reads/month
- 1 million row writes/month

**Setup:**
1. Go to [Turso](https://turso.tech/)
2. Install CLI: `npm install -g @libsql/client`
3. Create database
4. Works with your existing SQLite schema!

## 🚀 Quick Setup Commands

### For Supabase (Recommended):
```bash
# Update schema for PostgreSQL
./scripts/setup-database.sh supabase

# Test connection
export DATABASE_URL="your-supabase-connection-string"
npm run db:test
```

### For Railway:
```bash
# Update schema for PostgreSQL  
./scripts/setup-database.sh supabase

# Test connection
export DATABASE_URL="your-railway-connection-string"
npm run db:test
```

### For Turso (Keep SQLite):
```bash
# No schema changes needed!
export DATABASE_URL="your-turso-connection-string"
npm run db:test
```

## 💡 Recommendation for EduTube

**Use Supabase** because:
- Truly free forever (500MB is plenty for development)
- PostgreSQL is robust and well-supported
- Great documentation and tooling
- Includes authentication if you want to upgrade from NextAuth
- Real-time features for future enhancements

## 📝 Next Steps

1. Choose Supabase (recommended)
2. Follow the setup guide: `docs/SUPABASE_SETUP.md`
3. Test locally, then deploy to Netlify
4. Your EduTube project will be production-ready!
