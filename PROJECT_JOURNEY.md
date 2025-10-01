# 📋 Project Journey: Azure AI Foundry Figma Plugin

## What We Built
A working Figma plugin that analyzes design elements using Azure AI Foundry agents and provides actionable design suggestions.

## Final Architecture ✅
- **Frontend**: Figma plugin (TypeScript) with HTML/JS UI
- **Backend**: Express.js server on Azure Container Apps  
- **AI**: Azure AI Foundry agent (REST API, no tools)
- **Flow**: Figma → Container Apps → Azure AI Foundry → Suggestions → Figma

## Dead Ends & Failed Approaches ❌

### 1. Azure SDK Hell (Days 1-3)
**Tried**: Direct Azure AI Foundry SDK integration
**Problems**: 
- SDK deployment conflicts
- Dependency version mismatches  
- Complex authentication flows
**Lesson**: REST APIs are simpler than SDKs for this use case

### 2. Static Web Apps + CORS Nightmare (Days 4-5) 
**Tried**: Azure Static Web Apps for hosting
**Problems**:
- Figma's null origin breaks CORS
- iframe restrictions
- Complex function app integration
**Lesson**: Need full server control for Figma plugins

### 3. App Service Deployment Hell (Days 6-7)
**Tried**: Azure App Service B1 hosting
**Problems**:
- 15+ minute deployment timeouts consistently  
- Windows path conflicts with Linux containers
- Authentication prompts blocking access
- node_modules file limit issues
- Quota restrictions in East US
**Lesson**: App Service is overkill and problematic for this

### 4. The TypeScript Mystery (Day 8)
**Tried**: Editing compiled JavaScript files
**Problem**: All changes disappeared on build
**Discovery**: TypeScript compiler overwrites code.js 
**Lesson**: Always edit source files (.ts), not compiled output

### 5. The Agent Tool Confusion (Day 9)
**Tried**: Agent configured with designAnalysisTool
**Problem**: Agent kept saying "cannot assist"
**Root Cause**: Agent trying to call non-existent external tool
**Solution**: Remove all tools, make agent respond directly

## What Actually Worked ✅

### Technical Stack
- **Azure Container Apps**: Source-to-cloud deployment, auto-scaling
- **Express.js with CORS**: Full control over headers and responses
- **TypeScript source editing**: Proper development workflow
- **Agent with no tools**: Direct text responses only
- **REST API approach**: Simpler than SDK integration

### Key Success Factors
1. **Container Apps deployment**: Fast, reliable, auto-scaling
2. **Proper CORS setup**: Wildcard origins for Figma compatibility  
3. **Agent instructions**: Clear, tool-free configuration
4. **Message flow**: UI → Main thread → Azure (avoids CORS)
5. **Environment variables**: Secure secret management

## Lessons for Future Projects

### Do This ✅
- Use Azure Container Apps for quick Node.js deployments
- Edit TypeScript source files, not compiled JavaScript
- Test CORS extensively with Figma's null origin
- Configure AI agents without external tools for simple responses
- Use REST APIs over SDKs when possible

### Avoid This ❌
- Azure App Service for simple Node.js apps (deployment issues)
- Static Web Apps for Figma plugins (CORS limitations)  
- Editing compiled JavaScript files (gets overwritten)
- AI agents with tool dependencies (adds complexity)
- Including node_modules in deployment packages (huge files)

## Final Working Flow

1. **User selects elements** in Figma
2. **Plugin extracts data** (types, sizes, colors, text)
3. **Main thread sends** to Container Apps API
4. **Express server** authenticates with Azure
5. **REST API call** to Azure AI Foundry agent  
6. **Agent analyzes** and responds with text suggestions
7. **Server parses** response into structured suggestions
8. **Plugin displays** actionable recommendations
9. **User applies** changes back to Figma elements

## Time Investment
- **Total time**: ~9 days
- **Failed approaches**: ~7 days
- **Working solution**: ~2 days  
- **Success rate**: 22% (typical for R&D projects)

## Cost Analysis
- **Failed experiments**: ~$50 in Azure resources
- **Final working solution**: ~$5/month ongoing
- **ROI**: High for design team productivity gains