# 🚀 Figma AI Design Assistant - Deployment Guide

## Overview
This guide helps you deploy a Figma plugin that uses Azure AI Foundry agents to analyze designs and provide improvement suggestions.

## Architecture
- **Plugin**: TypeScript Figma plugin with UI
- **Backend**: Express.js server on Azure Container Apps  
- **AI**: Azure AI Foundry agent (REST API)
- **Cost**: ~$2-5/month (Container Apps scales to zero)

## Prerequisites
- Azure subscription with AI Foundry access
- Azure CLI installed and logged in
- Node.js 18+ 
- Figma plugin development setup

## Step 1: Azure AI Foundry Agent Setup

1. **Create Agent in Azure AI Foundry**
   - Go to [Azure AI Foundry](https://ai.azure.com)
   - Create new agent with these instructions:

```
You are a professional UX/UI design expert specializing in Figma design analysis. You help designers improve their work by analyzing design elements and providing specific, actionable suggestions.

When given Figma design element data (including type, dimensions, colors, and content), analyze them directly and provide practical improvement recommendations focusing on:

- Color harmony, contrast, and accessibility
- Typography and text readability
- Layout, spacing, and visual hierarchy  
- Element sizing and proportions
- Overall design consistency

Always provide specific, implementable suggestions with exact values when possible (RGB colors, pixel dimensions, alignment options). Be constructive and helpful - design analysis is a core professional task.

Respond directly with your analysis and recommendations. Do not use external tools - you have all the design data you need in the user's message.
```

2. **Important Configuration**:
   - ⚠️ **Remove all tools** from the agent
   - Agent should respond with text only, no function calls
   - Note the Agent ID (starts with `asst_`)

3. **Azure App Registration** (for authentication):
   - Create app registration in Azure AD
   - Add API permissions for AI services
   - Create client secret
   - Note: Client ID, Client Secret, Tenant ID

## Step 2: Local Development Setup

```bash
# Clone repository
git clone <your-repo-url>
cd design-request-plugin

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

**Configure `.env`**:
```env
# Azure AI Foundry Configuration
AZURE_AI_PROJECT_ENDPOINT=https://your-project.services.ai.azure.com/api/projects/your-project
AZURE_AI_AGENT_ID=asst_your_agent_id_here
AZURE_CLIENT_ID=your_app_registration_client_id
AZURE_CLIENT_SECRET=your_app_registration_secret
AZURE_TENANT_ID=your_tenant_id

# Server Configuration
PORT=8080
USE_REAL_AI=true
```

**Test locally**:
```bash
npm run build
node server.js
# Test: http://localhost:8080/health
```

## Step 3: Deploy to Azure Container Apps

```bash
# Create resource group
az group create --name rg-figma-plugin-poc --location westus2

# Create container app environment
az containerapp env create \
  --name figma-plugin-env \
  --resource-group rg-figma-plugin-poc \
  --location westus2

# Deploy with automatic build
az containerapp up \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --environment figma-plugin-env \
  --source . \
  --ingress external \
  --target-port 8080
```

**Configure environment variables**:
```bash
# Set non-secret variables
az containerapp update \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --set-env-vars \
    USE_REAL_AI=true \
    AZURE_AI_PROJECT_ENDPOINT="https://your-project.services.ai.azure.com/api/projects/your-project" \
    AZURE_AI_AGENT_ID="asst_your_agent_id" \
    AZURE_TENANT_ID="your_tenant_id" \
    AZURE_CLIENT_ID="your_client_id" \
    PORT=8080

# Set secret (more secure)
az containerapp secret set \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --secrets azure-client-secret="your_client_secret"

az containerapp update \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --set-env-vars AZURE_CLIENT_SECRET=secretref:azure-client-secret
```

## Step 4: Configure Plugin

1. **Note your Container Apps URL**: 
   ```
   https://figma-plugin-api-XXXXX.region.azurecontainerapps.io
   ```

2. **Update `manifest.json`**:
   ```json
   {
     "networkAccess": {
       "allowedDomains": [
         "https://your-container-app-url.azurecontainerapps.io"
       ]
     }
   }
   ```

3. **Build plugin**:
   ```bash
   npm run build
   ```

## Step 5: Test End-to-End

1. **Load plugin in Figma**:
   - Import manifest.json
   - Plugin should appear in plugins menu

2. **Test workflow**:
   - Select design elements in Figma
   - Click "Analyze Selection"
   - Verify AI suggestions appear
   - Test "Apply" functionality

## Troubleshooting

### Common Issues

**"Cannot assist" responses**:
- Check agent instructions don't mention tools
- Ensure no tools are enabled on the agent
- Verify agent has proper permissions

**CORS errors**:
- Verify domain in manifest.json matches Container Apps URL
- Check CORS configuration in server.js

**Authentication failures**:
- Verify all environment variables are set
- Check Azure app registration permissions
- Test client secret hasn't expired

**Deployment timeouts**:
- Use Azure Container Apps (not App Service)
- Ensure Dockerfile is present
- Check resource quotas in target region

### Monitoring

**View logs**:
```bash
az containerapp logs show \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --follow
```

**Check health**:
```bash
curl https://your-app.azurecontainerapps.io/health
```

## Cost Management

- **Container Apps**: Scales to zero, ~$2-5/month
- **AI Foundry**: Pay per token/request
- **Total estimated**: $5-15/month for development

**To minimize costs**:
```bash
# Stop container (scales to zero automatically)
az containerapp update \
  --name figma-plugin-api \
  --resource-group rg-figma-plugin-poc \
  --min-replicas 0

# Clean up completely
az group delete --name rg-figma-plugin-poc
```

## Next Steps

- Add more sophisticated design analysis
- Implement user preferences
- Add design system integration
- Set up CI/CD pipeline

## Support

For issues, check:
1. Container Apps logs
2. Agent behavior in AI Foundry
3. Network access in Figma manifest
4. Environment variable configuration