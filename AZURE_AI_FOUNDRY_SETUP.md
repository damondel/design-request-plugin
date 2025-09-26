# Azure AI Foundry Integration Setup (SDK-Free)

## ✅ No SDK Dependencies Required

This implementation uses **direct REST API calls** to Azure AI Foundry instead of Azure SDKs, avoiding deployment issues.

## Environment Variables Required

To enable Azure AI Foundry agent integration, configure these environment variables in your Azure Static Web App:

### Core Variables

1. **AZURE_AI_PROJECT_ENDPOINT**
   - Description: The REST API endpoint for your Azure AI Foundry project
   - Example: `https://wmdefault-2478-resource.services.ai.azure.com/api/projects/wmdefault-2478`
   - Location: Azure AI Foundry Studio → Your Project → Settings → Connection strings

2. **AZURE_AI_AGENT_ID**
   - Description: The ID of your specific AI agent in Azure AI Foundry
   - Example: `asst_qrwJB85AgguLd3cIPJjF86Nv`
   - Location: Azure AI Foundry Studio → Your Project → Agents → Your Agent → Settings

### Authentication Variables (for REST API calls)

3. **AZURE_TENANT_ID**
   - Description: Azure tenant ID for OAuth authentication
   - Example: `12345678-1234-1234-1234-123456789012`

4. **AZURE_CLIENT_ID**
   - Description: Client ID of your Azure app registration/service principal
   - Example: `12345678-1234-1234-1234-123456789012`

5. **AZURE_CLIENT_SECRET**
   - Description: Client secret for service principal authentication
   - Example: `your-client-secret-here`

### Fallback Variables (Azure OpenAI as backup)

6. **AZURE_OPENAI_ENDPOINT**
   - Description: Fallback Azure OpenAI endpoint if Foundry fails
   - Example: `https://your-openai-resource.openai.azure.com`

7. **AZURE_OPENAI_API_KEY**
   - Description: API key for Azure OpenAI fallback
   - Example: `your-openai-api-key`

8. **AZURE_OPENAI_DEPLOYMENT_NAME**
   - Description: Deployment name for Azure OpenAI model
   - Example: `gpt-4`

## Implementation Approaches

The system uses a **multi-tier fallback strategy**:

1. **Primary**: Azure AI Foundry via REST API (no SDK dependencies)
2. **Fallback**: Azure OpenAI with agent-style prompts
3. **Final Fallback**: Mock responses for testing

## Configuration Steps

### 1. Set Environment Variables in Azure Static Web App

```bash
# In Azure Portal, go to your Static Web App
# → Configuration → Application settings
# Add these key-value pairs:

AZURE_AI_PROJECT_ENDPOINT=https://your-project-endpoint
AZURE_AI_AGENT_ID=your-agent-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Fallback configuration
AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-openai-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

### 2. Authentication Flow

The SDK-free approach uses OAuth 2.0 client credentials flow:

1. Gets access token from `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
2. Uses token for authenticated REST API calls to Azure AI Foundry
3. No Azure SDK dependencies = no deployment issues

### 3. API Endpoint Behavior

The `/api/analyze-foundry` endpoint will:

1. Try to connect to Azure AI Foundry with the configured credentials
2. Fall back to Azure OpenAI if Foundry is unavailable
3. Fall back to mock responses if both fail

## Current Status

- ✅ **SDK-free implementation** using direct REST API calls
- ✅ Azure AI Foundry integration code is enabled
- ✅ New `/api/analyze-foundry` endpoint created
- ✅ UI updated to support provider selection
- ✅ Multi-tier fallback strategy implemented
- ⏳ Environment variables need to be configured in Azure Portal
- ⏳ End-to-end testing needed

## Next Steps

1. Configure the environment variables in your Azure Static Web App
2. Test the Azure AI Foundry endpoint
3. Verify the complete workflow works from Figma → Azure → AI Foundry → Back to Figma

## Advantages of This Approach

- **No SDK dependencies** - avoids deployment issues you encountered
- **Multiple fallbacks** - system remains functional even if Foundry is unavailable  
- **Pure REST API** - only uses axios (already working in your deployment)
- **Flexible authentication** - supports both service principal and managed identity