# Rigid Residential Web App

A production-grade web application for Rigid Residential properties, featuring public listings, resident authentication via AWS Cognito, and an authenticated resident portal.

## 🏗️ Architecture

This is a monorepo containing:

- **`packages/frontend`** - Next.js 14 web application with Tailwind CSS
- **`packages/lambdas`** - TypeScript AWS Lambda functions
- **`packages/infra`** - AWS CDK infrastructure as code

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: AWS Lambda (Node.js), API Gateway, Cognito
- **Infrastructure**: AWS CDK (TypeScript)
- **Database**: AWS RDS (PostgreSQL) - *configured separately*

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- AWS CLI configured with credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`
- Existing AWS resources (Cognito User Pool, RDS)

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### 2. Configure Frontend Environment

Copy the template and fill in your AWS values:

```bash
cd packages/frontend
cp .env.local.template .env.local
```

Edit `packages/frontend/.env.local` with your actual values:

```env
NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.eu-central-1.amazonaws.com/prod
NEXT_PUBLIC_COGNITO_HOSTED_UI=https://YOUR_DOMAIN.auth.eu-central-1.amazoncognito.com/oauth2/authorize
NEXT_PUBLIC_COGNITO_LOGOUT=https://YOUR_DOMAIN.auth.eu-central-1.amazoncognito.com/logout
NEXT_PUBLIC_COGNITO_TOKEN_URL=https://YOUR_DOMAIN.auth.eu-central-1.amazoncognito.com/oauth2/token
NEXT_PUBLIC_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/callback
NEXT_PUBLIC_LOGOUT_REDIRECT_URI=http://localhost:3000
```

### 3. Run Development Server

```bash
npm run dev
```

This starts the Next.js development server at http://localhost:3000

## 📦 Deployment

### Deploy Backend Infrastructure

1. **Build Lambda functions:**

```bash
cd packages/lambdas
npm run build
cd ../..
```

2. **Configure CDK environment variables:**

Set your existing Cognito User Pool ID:

```bash
# Windows PowerShell
$env:COGNITO_USER_POOL_ID="YOUR_USER_POOL_ID"
$env:COGNITO_CLIENT_ID="YOUR_CLIENT_ID"
```

3. **Bootstrap CDK (first time only):**

```bash
cd packages/infra
npx cdk bootstrap
```

4. **Deploy the stack:**

```bash
npm run deploy
```

This will:
- Deploy all Lambda functions
- Create API Gateway with endpoints
- Configure Cognito authorizer
- Output the API Gateway URL

5. **Update frontend .env.local** with the deployed API URL from CDK outputs

### Deploy Frontend

**Option A: Vercel (Recommended)**

```bash
cd packages/frontend
vercel
```

**Option B: AWS Amplify**

Connect your GitHub repo to AWS Amplify and configure build settings:

```yaml
version: 1
applications:
  - frontend:
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
          - node_modules/**/*
```

## 📁 Project Structure

```
rigid/
├── packages/
│   ├── frontend/              # Next.js web application
│   │   ├── lib/
│   │   │   ├── auth.ts        # Cognito authentication logic
│   │   │   └── api.ts         # API client for backend calls
│   │   ├── pages/
│   │   │   ├── index.tsx      # Main application page
│   │   │   ├── api/
│   │   │   │   └── callback.tsx  # Cognito OAuth callback
│   │   │   ├── _app.tsx
│   │   │   └── _document.tsx
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── .env.local.template
│   │   └── package.json
│   │
│   ├── lambdas/               # AWS Lambda handlers
│   │   ├── src/
│   │   │   ├── getUnits.ts
│   │   │   ├── getBuildings.ts
│   │   │   ├── postInquiry.ts
│   │   │   ├── getTickets.ts
│   │   │   ├── postTicket.ts
│   │   │   └── getNotices.ts
│   │   └── package.json
│   │
│   └── infra/                 # AWS CDK infrastructure
│       ├── bin/
│       │   └── infra.ts       # CDK app entry point
│       ├── lib/
│       │   └── rigid-infra-stack.ts  # Main stack definition
│       ├── cdk.json
│       └── package.json
│
├── package.json               # Root package.json (workspace config)
├── tsconfig.json
└── README.md
```

## 🔑 Features

### Public Features
- **Buildings Overview**: Browse all residential properties
- **Available Units**: View and filter available units with pricing
- **Contact Form**: Submit general inquiries

### Authenticated Features (Residents)
- **Resident Login**: AWS Cognito Hosted UI authentication
- **Maintenance Tickets**: Submit and track maintenance requests
- **Notices**: View building-wide announcements and updates
- **Ticket History**: View all past and current maintenance requests

## 🔧 Development

### Run Frontend Only

```bash
npm run dev
```

### Build All Packages

```bash
npm run build
```

### Deploy Infrastructure

```bash
npm run deploy
```

### Clean All Build Artifacts

```bash
npm run clean
```

## 🌐 API Endpoints

### Public Endpoints

- `GET /units` - List all available units
- `GET /buildings` - List all buildings
- `POST /inquiries` - Submit a general inquiry

### Protected Endpoints (Requires Authentication)

- `GET /tickets` - Get resident's maintenance tickets
- `POST /tickets` - Create a new maintenance ticket
- `GET /notices` - Get active notices for residents

## 🎨 UI Design

The frontend follows an Airbnb-inspired minimalist aesthetic:

- Clean white cards with subtle shadows
- Light gray background
- Rounded corners on all UI elements
- Black accent color for primary actions
- Responsive grid layouts
- Sticky navigation bar

## 🔐 Authentication Flow

1. User clicks "Resident Login"
2. Redirects to Cognito Hosted UI
3. User authenticates with credentials
4. Cognito redirects to `/api/callback` with authorization code
5. Frontend exchanges code for tokens
6. Tokens stored in localStorage
7. API calls include Bearer token in Authorization header

## 📝 Environment Variables

### Frontend (.env.local)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API Gateway base URL |
| `NEXT_PUBLIC_COGNITO_HOSTED_UI` | Cognito OAuth authorize endpoint |
| `NEXT_PUBLIC_COGNITO_LOGOUT` | Cognito logout endpoint |
| `NEXT_PUBLIC_COGNITO_TOKEN_URL` | Cognito token exchange endpoint |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito app client ID |
| `NEXT_PUBLIC_REDIRECT_URI` | OAuth callback URL |
| `NEXT_PUBLIC_LOGOUT_REDIRECT_URI` | Post-logout redirect URL |

### CDK Deployment

| Variable | Description |
|----------|-------------|
| `COGNITO_USER_POOL_ID` | Existing Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | Existing Cognito App Client ID |

## 🐛 Troubleshooting

### "Failed to exchange code for tokens"

- Verify `NEXT_PUBLIC_COGNITO_TOKEN_URL` is correct
- Check that `NEXT_PUBLIC_REDIRECT_URI` matches Cognito app client callback URLs
- Ensure Cognito app client has "Authorization code grant" enabled

### CORS Errors

- Verify API Gateway CORS is configured (already set in CDK)
- Check that frontend is sending requests to the correct API URL

### Lambda Functions Not Updating

1. Rebuild lambdas: `cd packages/lambdas && npm run build`
2. Redeploy: `cd ../infra && npm run deploy`

## 📄 License

Proprietary - Rigid Residential © 2025

## 👥 Support

For technical support, contact: engineering@rigidresidential.com
