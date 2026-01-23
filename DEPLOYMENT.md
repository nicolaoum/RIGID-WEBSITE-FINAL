# Deployment Guide for Rigid Residential

## Prerequisites
- Domain: rigidresidential.com
- AWS Account with CLI configured
- GitHub repository

## AWS Amplify Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Production ready deployment"
git push origin main
```

### 2. Deploy to AWS Amplify

#### Option A: Using AWS Console (Recommended for first-time setup)
1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. Click "New app" → "Host web app"
3. Select "GitHub" and authorize
4. Select your repository and branch (main)
5. Build settings:
   - Framework: Next.js - SSR
   - Build command: `npm run build`
   - Base directory: `packages/frontend`
   - Output directory: `.next`
6. **Environment Variables** - Add these:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/prod
   NEXT_PUBLIC_COGNITO_DOMAIN=rigid-residential-auth
   NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-central-1_YOUR_POOL_ID
   NEXT_PUBLIC_COGNITO_CLIENT_ID=<your-cognito-client-id>
   NEXT_PUBLIC_REDIRECT_URI=https://rigidresidential.com/api/callback
   ```
7. Click "Save and deploy"

#### Option B: Using AWS CLI
```bash
# Install Amplify CLI if not installed
npm install -g @aws-amplify/cli

# Initialize Amplify in your project
cd "d:\Rigid\Website for rigid\RIGID"
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

### 3. Configure Custom Domain
1. In Amplify Console, go to "Domain management"
2. Click "Add domain"
3. Enter: rigidresidential.com
4. Follow AWS instructions to update your domain's DNS records
5. AWS will provision SSL certificate automatically

### 4. Update Cognito Callback URLs
After getting your Amplify URL:
```bash
# Update Cognito User Pool settings
aws cognito-idp update-user-pool-client \
  --user-pool-id eu-central-1_YOUR_POOL_ID \
  --client-id <your-client-id> \
  --callback-urls https://rigidresidential.com/api/callback \
  --logout-urls https://rigidresidential.com \
  --allowed-o-auth-flows-user-pool-client \
  --region eu-central-1
```

### 5. Update CORS in API Gateway
The CORS has been configured to allow your domain. If you need to update it:
```bash
cd packages/infra
npx cdk deploy RigidInfraStack --require-approval never
```

## Backend (Already Deployed)
- API Gateway: https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/prod/
- Lambda Functions: Deployed via CDK
- DynamoDB Tables: rigid-buildings, rigid-units, rigid-notices, rigid-tickets

## Post-Deployment Checklist
- [ ] GitHub repository is up to date
- [ ] Amplify app is connected to GitHub
- [ ] Environment variables are set in Amplify
- [ ] Custom domain (rigidresidential.com) is configured
- [ ] SSL certificate is active
- [ ] Cognito callback URLs updated
- [ ] Test login flow
- [ ] Test resident registration
- [ ] Test announcements system
- [ ] Test ticket submission

## Monitoring
- Amplify Console: https://console.aws.amazon.com/amplify/
- CloudWatch Logs: Lambda function logs
- API Gateway Metrics: Request counts and errors

## Costs (Estimated Monthly)
- AWS Amplify: ~$15-30 (includes SSL, CDN)
- Lambda: ~$0-5 (free tier covers most)
- DynamoDB: ~$0-5 (free tier covers most)
- API Gateway: ~$3.50 per million requests
- **Total: ~$20-50/month** (depending on traffic)
