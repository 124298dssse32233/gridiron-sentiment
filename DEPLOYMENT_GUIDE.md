# Railway Deployment Guide - Complete Beginner

This guide walks you through deploying the Sentiment Service to Railway step by step.

## What is Railway?

Railway is a cloud platform that makes it easy to deploy apps. It's like Heroku but simpler and cheaper.
- Free tier to start
- $5/month for the basic paid plan
- Automatically detects your code and sets up servers

---

## Step 1: Create a Railway Account

1. Go to https://railway.app/
2. Click **"Login"** in the top right
3. Sign in with:
   - GitHub (recommended), OR
   - Google, OR
   - Email
4. You'll be redirected to your Railway dashboard

---

## Step 2: Create Your First Project

1. On the Railway dashboard, click **"New Project"**
   - Button is at the top left or center of screen
2. A dialog will appear asking where your code is:
3. Click **"Deploy from GitHub repo"**
4. If this is your first time, Railway will ask to connect to your GitHub:
   - Click **"Configure GitHub App"**
   - Authorize Railway to access your repositories
5. Select your repository from the list
   - Look for the repo containing the `services/sentiment` folder
   - If you don't see it, make sure the repo is public or you've granted access

---

## Step 3: Set Up the Database (Before Deploying Code)

Sentiment service needs a database to store sentiment data.

1. **Still in your Railway project**, click **"New Service"**
2. Select **"Database"** from the options
3. Select **"PostgreSQL"** (the elephant icon)
4. Click **"Add PostgreSQL"**
5. Railway will create a database - this takes about 30 seconds
6. Once ready, you'll see a database card with connection info

### Get Your Database URL

1. Click on the **PostgreSQL** card in your project
2. Click on the **"Variables"** tab at the top
3. Look for a variable called `DATABASE_URL`
4. Click the copy button next to it - **save this somewhere** - you'll need it soon

The URL looks like:
```
postgresql://postgres:password@xyz.railway.app:5432/railway
```

---

## Step 4: Configure Your Repository for Railway

Railway needs to know where your sentiment service code is located.

### Option A: Move sentiment service to root of a new repo (Easier)

1. Create a new GitHub repository called `gridiron-sentiment`
2. Copy the entire `services/sentiment` folder contents to this new repo's root
3. The structure should be:
   ```
   gridiron-sentiment/
   ├── main.py
   ├── requirements.txt
   ├── Dockerfile
   ├── railway.toml
   ├── models/
   ├── collectors/
   └── analyzers/
   ```

### Option B: Use existing repo (Advanced)

If keeping in current repo, update `railway.toml` with the correct path.

---

## Step 5: Push Your Code to GitHub

1. Open your terminal/command prompt

2. Navigate to your sentiment folder:
   ```bash
   cd "C:\Users\kevin\Downloads\Sports Website 1\gridiron-intel\services\sentiment"
   ```

3. Initialize git (if not already done):
   ```bash
   git init
   ```

4. Create a `.gitignore` file (exclude unnecessary files):
   ```bash
   echo "__pycache__/" > .gitignore
   echo "*.pyc" >> .gitignore
   echo ".env" >> .gitignore
   echo ".DS_Store" >> .gitignore
   ```

5. Add all files:
   ```bash
   git add .
   ```

6. Commit:
   ```bash
   git commit -m "Initial sentiment service"
   ```

7. Create a new GitHub repo:
   - Go to https://github.com/new
   - Name it `gridiron-sentiment`
   - Make it Public (easier) or Private (fine too)
   - Click "Create repository"

8. Connect your local code to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gridiron-sentiment.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 6: Deploy to Railway

1. Go back to Railway
2. In your project, click **"New Service"**
3. Select **"Deploy from GitHub repo"**
4. Find and select `gridiron-sentiment` (or whatever you named it)
5. Railway will start deploying automatically!

**Wait for deployment** - this takes 3-5 minutes the first time because it:
- Downloads Python dependencies
- Builds the Docker image
- Downloads the NLP models (~250MB)

You'll see logs streaming in the "Logs" tab.

---

## Step 7: Set Environment Variables

The service needs to know how to connect to your database.

1. In Railway, click on your **sentiment service** (not the database)
2. Click the **"Variables"** tab
3. Click **"New Variable"**
4. Add the following:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (paste the DATABASE_URL from Step 3) |
| `PORT` | `8000` |
| `ENVIRONMENT` | `production` |

5. After adding, the service will restart automatically

---

## Step 8: Verify Deployment

1. Click the **"Logging"** tab to see if the service started successfully
2. Look for these messages:
   - `"Starting Gridiron Intel Sentiment Service"`
   - `"Database connection established"`
   - `"NLP models loaded"`
3. If you see errors, check the Troubleshooting section below

4. **Test the health endpoint:**
   - Click the **"Networking"** tab
   - Copy the **"Public URL"** (looks like `https://xyz.up.railway.app`)
   - Open a new browser tab and go to: `https://xyz.up.railway.app/health`
   - You should see:
     ```json
     {"status":"healthy","database":true,"timestamp":"..."}
     ```

---

## Step 9: Set Up Cron (Automatic Processing)

Cron makes the service run automatically every 6 hours.

1. In Railway, click your **sentiment service**
2. Click the **"Settings"** tab (gear icon)
3. Scroll down to **"Cron Jobs"**
4. Click **"Add Cron"**
5. Configure:
   - **Command**: `POST /cron/process`
   - **Schedule**: Select "Custom" and enter: `0 */6 * * *`
   - This means: "At minute 0 of every 6th hour"
6. Click **"Add Cron Job"**

The service will now automatically collect and process sentiment every 6 hours.

---

## Step 10: Test the Full Pipeline

Let's manually trigger sentiment processing to make sure everything works.

1. Open your terminal (or use a tool like Postman)
2. Run this command (replace with your URL):
   ```bash
   curl -X POST https://your-service-url.up.railway.app/process
   ```

   Or use PowerShell:
   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://your-service-url.up.railway.app/process"
   ```

3. You should get a response like:
   ```json
   {
     "success": true,
     "message": "Processed sentiment data for 2024",
     "stats": {
       "bluesky_collected": 150,
       "reddit_collected": 80,
       "news_collected": 45,
       "posts_analyzed": 275,
       "teams_updated": 130
     }
   }
   ```

4. Check the database in Railway:
   - Click the PostgreSQL database card
   - Click "Query" (magnifying glass icon)
   - Run: `SELECT COUNT(*) FROM sentiment_raw;`
   - You should see data being stored!

---

## Troubleshooting

### Error: "Database not configured"
**Cause**: DATABASE_URL environment variable not set
**Fix**: Go to Variables tab and add DATABASE_URL

### Error: "Module not found"
**Cause**: requirements.txt wasn't installed properly
**Fix**: Check that requirements.txt is in the root folder and redeploy

### Error: "Permission denied"
**Cause**: Database connection issue
**Fix**: Make sure you're using the Railway pooler URL format:
```
postgresql://postgres:password@host.railway.app:5432/railway
```

### Service crashes on startup
**Cause**: Might be out of memory (NLP models need ~500MB)
**Fix**: Upgrade to the $5/month plan (512MB RAM)

### Logs show "PyTrends rate limit"
**Cause**: Google Trends has strict rate limits
**Fix**: This is expected - trends collection runs once daily, not hourly

---

## Summary of Costs

| Service | Cost |
|---------|------|
| Sentiment Service | $5/month |
| PostgreSQL Database | $5/month |
| **Total** | **~$10/month** |

You can start with free credits and upgrade when ready.

---

## Next Steps

Once deployed and working:

1. **Monitor the service**: Check logs weekly for any errors
2. **Check the data**: Query the database to see sentiment accumulating
3. **Connect to main app**: Your Next.js app can now query the `/api/sentiment` endpoints
4. **Adjust frequency**: During football season, you might want every 3 hours instead of 6

---

## Quick Reference

| Task | Command/URL |
|------|-------------|
| Health Check | `GET /health` |
| View Stats | `GET /stats` |
| Manual Process | `POST /process` |
| Cron Trigger | `POST /cron/process` |
| View Logs | Railway → Service → Logging tab |
| Query DB | Railway → Database → Query tab |

---

Need help? Check Railway's docs: https://docs.railway.app/
