# Quick Deployment to AWS Amplify

## Step 1: Push to GitHub
```bash
cd "d:\Rigid\Website for rigid\RIGID"
git add .
git commit -m "Production ready - announcements system complete"
git push origin main
```

## Step 2: Deploy via AWS Amplify Console

1. **Open AWS Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify/
   - Click "New app" → "Host web app"

2. **Connect GitHub**
   - Select "GitHub"
   - Click "Connect branch"
   - Authorize AWS Amplify to access your GitHub
   - Select repository: `<your-github-username>/RIGID` (or whatever your repo is named)
   - Select branch: `main`
   - Click "Next"

3. **Configure Build Settings**
   - App name: `Rigid Residential`
   - Environment: `production`
   
   **Build settings - Use this YAML:**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd packages/frontend
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: packages/frontend/.next
       files:
         - '**/*'
     cache:
       paths:
         - packages/frontend/node_modules/**/*
   ```

4. **Add Environment Variables**
   Click "Advanced settings" → Add environment variables:
   
   ```
   NEXT_PUBLIC_API_URL = https://fn3vprq951.execute-api.us-east-1.amazonaws.com/prod
   NEXT_PUBLIC_COGNITO_DOMAIN = rigid-residential-auth
   NEXT_PUBLIC_COGNITO_USER_POOL_ID = us-east-1_0jpfXq1IU
   NEXT_PUBLIC_COGNITO_CLIENT_ID = 205455frahsacolm9geoe3khc6
   NEXT_PUBLIC_REDIRECT_URI = https://rigidresidential.com/api/callback
   ```

5. **Save and Deploy**
   - Click "Save and deploy"
   - Wait for deployment (5-10 minutes)
   - You'll get a URL like: `https://main.d1234567890.amplifyapp.com`

## Step 3: Add Custom Domain

1. **In Amplify Console**
   - Click "Domain management" in left sidebar
   - Click "Add domain"
   - Enter: `rigidresidential.com`

2. **Configure DNS**
   AWS will show you DNS records to add. Go to your domain registrar (GoDaddy, Namecheap, etc.) and add:
   
   **For root domain (rigidresidential.com):**
   - Type: `CNAME` or `ALIAS`
   - Name: `@` or leave blank
   - Value: (AWS will provide this)
   
   **For www subdomain:**
   - Type: `CNAME`
   - Name: `www`
   - Value: (AWS will provide this)

3. **Wait for SSL Certificate**
   - AWS automatically provisions SSL certificate
   - Takes 5-30 minutes
   - Status will change to "Available" when ready

## Step 4: Update Environment Variable

Once your custom domain is active:

1. Go back to Amplify Console → "Environment variables"
2. Update `NEXT_PUBLIC_REDIRECT_URI` to:
   ```
   https://rigidresidential.com/api/callback
   ```
3. Click "Save"
4. Trigger a new deployment (or push a commit to GitHub)

## Step 5: Test Everything

✅ Visit https://rigidresidential.com
✅ Test login (should redirect to Cognito)
✅ Test resident registration
✅ Test staff announcements creation
✅ Test resident viewing announcements (filtered by building)
✅ Test ticket submission

## Costs Breakdown

**Monthly estimates:**
- AWS Amplify: $15-25 (includes hosting, SSL, CDN)
- API Gateway: ~$3.50 per million requests
- Lambda: $0 (free tier covers most usage)
- DynamoDB: $0-5 (free tier covers most usage)
- Cognito: $0 (free tier up to 50,000 MAU)

**Total: ~$20-35/month** for moderate usage

## Troubleshooting

**If login doesn't work:**
- Check Cognito callback URLs include your domain
- Check NEXT_PUBLIC_REDIRECT_URI matches your domain
- Clear browser cache/cookies

**If API calls fail:**
- Check CORS settings in API Gateway
- Check NEXT_PUBLIC_API_URL is correct
- Check CloudWatch logs for Lambda errors

**If build fails:**
- Check Node.js version in Amplify settings (use 18.x)
- Check build logs in Amplify Console
- Verify package.json dependencies

## Support

- AWS Amplify Docs: https://docs.amplify.aws/
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/
- API Gateway Console: https://console.aws.amazon.com/apigateway/
