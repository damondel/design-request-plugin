# Design Request Plugin — Figma to Microsoft Foundry

A Figma plugin that extracts selected design elements and sends them to a Microsoft Foundry agent for AI-powered design suggestions, without leaving the design tool.

## Architecture

- **Frontend**: Figma plugin (TypeScript) with HTML/JS UI
- **Backend**: Express.js server on Azure Container Apps
- **AI**: Microsoft Foundry agent (REST API, no tools)
- **Flow**: Figma → Container Apps → Microsoft Foundry → Suggestions → Figma
- **Cost**: ~$2-5/month (Container Apps scales to zero)

## How It Works

1. User selects elements in Figma
2. Plugin extracts data (types, sizes, colors, text)
3. Main thread sends to Container Apps API
4. Express server authenticates with Azure
5. REST API call to Microsoft Foundry agent
6. Agent analyzes and responds with text suggestions
7. Server parses response into structured suggestions
8. Plugin displays actionable recommendations
9. User applies changes back to Figma elements

## Two Development Stages

### Stage 1: Local Development
Plugin talks to a local Express server hitting Microsoft Foundry's REST API. Good for rapid iteration and testing.

```powershell
npm install
node server.js
```

### Stage 2: Deployed to Azure Container Apps
After validating locally, the backend was deployed to Azure Container Apps for shared access. This required solving several challenges (see [Project Journey](PROJECT_JOURNEY.md) for the full story of what worked and what didn't).

See [Deployment Guide](DEPLOYMENT_GUIDE.md) for setup instructions.

## Project Journey

This project went through several failed approaches before landing on the working solution:

- **Azure SDK** → dependency conflicts and complex auth flows
- **Static Web Apps** → Figma's null origin breaks CORS
- **App Service** → persistent deployment timeouts and path conflicts
- **Container Apps** ✅ → fast, reliable source-to-cloud deployment

~7 of the 9 days were spent on failed approaches; the working solution took 2 days. Full details in [PROJECT_JOURNEY.md](PROJECT_JOURNEY.md).

## Prerequisites

- Azure subscription with Microsoft Foundry access
- Azure CLI installed and logged in (`az login`)
- Node.js 18+
- Figma plugin development setup

## Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) — Azure Container Apps setup
- [Project Journey](PROJECT_JOURNEY.md) — What worked, what didn't, and why
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) — Pre-deploy verification

---

**Last Updated**: April 2026
