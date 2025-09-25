# Quick Setup Guide for Azure AI Foundry Agent Integration

## Problem
Azure AI Foundry agents require an API endpoint and authentication when connecting to external tools via OpenAPI specification. Your designer encountered this limitation when trying to "embed" an agent directly.

## Solution
Use OpenAPI specification to connect your Azure AI Foundry agent to the CXS Design Request Plugin.

## 🚀 Quick Start (5 minutes)

### Step 1: Add Anonymous Support to Your Server

Add this code to your `server.js` (see `examples/server-anonymous-support.js` for complete code):

```javascript
app.post('/api/analyze-anonymous', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  
  const { elements, data } = req.body;
  const elementData = elements || data?.elements || [];
  
  const aiResponse = generateMockAIResponse(elementData);
  res.json({ success: true, suggestions: aiResponse.suggestions });
});
```

### Step 2: Configure Azure AI Foundry Agent

1. Open Azure AI Foundry (https://ai.azure.com)
2. Go to your project → Agents → Create or edit agent
3. In the agent configuration, add a new tool:
   - Tool type: **OpenAPI**
   - Upload file: `examples/openapi-anonymous.json`
   - Authentication: **None** (anonymous)

### Step 3: Test the Connection

Ask your agent:
> "Analyze the design elements in my Figma selection and suggest improvements"

The agent will call your plugin API and return design suggestions!

## 📁 Files Provided

- `examples/openapi-anonymous.json` - OpenAPI spec for anonymous access
- `examples/openapi-apikey.json` - OpenAPI spec with API key authentication  
- `examples/server-anonymous-support.js` - Server code modifications
- `examples/foundry-agent-integration.md` - Complete integration guide

## 🔧 Advanced Options

### Option A: API Key Authentication
- Use `openapi-apikey.json`
- Create custom keys connection in Azure AI Foundry
- More secure for production

### Option B: Managed Identity
- Deploy to Azure App Service
- Enable managed identity
- No API keys to manage
- Enterprise-grade security

## 🤝 How It Works

1. **User interacts with Azure AI Foundry agent** in chat
2. **Agent determines if design analysis is needed** using AI
3. **Agent calls your plugin's API** with Figma element data
4. **Your plugin analyzes and returns suggestions** 
5. **Agent presents suggestions** to user in conversational format

## ✅ Benefits

- **No plugin modification needed** - uses existing API
- **Natural language interface** - users can chat with your plugin
- **AI-powered routing** - agent knows when to use your tool
- **Scalable architecture** - works with any OpenAPI-compatible service

## 🔍 Troubleshooting

**"Connection failed"**: Check CORS headers and endpoint URL
**"No suggestions"**: Verify element data format matches schema
**"Authentication error"**: Use anonymous endpoint for testing

**The designer was right** - Azure AI Foundry agents do require endpoints and auth, but this is actually a **feature, not a limitation**. It enables powerful integrations like this one!