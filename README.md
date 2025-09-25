# CXS AI Chat Request - Figma Plugin

A comprehensive example demonstrating contextual AI integration with Figma plugins. This project shows the complete architecture pattern for connecting Figma plugins with AI services, specifically developed in response to CXS design workflow requirements.

## 🎯 Overview

This plugin demonstrates:
- **AI Model Integration**: How to connect external AI services with Figma plugins
- **Message Passing**: Communication between plugin UI and main thread
- **API Management**: Secure handling of external API calls
- **Error Handling**: Robust error handling for network requests
- **User Experience**: Loading states, configuration management, and result display

## 🏗️ Architecture

```
Figma Plugin (Sandboxed)     External AI Service
┌─────────────────────┐      ┌──────────────────┐
│  UI (iframe)        │────→ │  REST API        │
│  - User Interface   │ HTTP │  - AI Model      │
│  - API Calls        │◄──── │  - Authentication│
│  - Error Handling   │      │  - CORS Support  │
└─────────────────────┘      └──────────────────┘
│           ▲
│ postMessage
▼           │
┌─────────────────────┐
│  Main Plugin Code   │
│  - Figma API        │
│  - Element Updates  │
│  - Data Processing  │
└─────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install plugin dependencies
npm install

# Install API server dependencies
cd api
npm install
cd ..
```

### 2. Environment Setup

**IMPORTANT**: You'll need to set up your own Azure OpenAI credentials.

1. Copy the example environment file:
```bash
copy .env.example .env
```

2. Edit `.env` and add your Azure OpenAI credentials:
```bash
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
```

**Note**: The `.env` file is excluded from git for security. Never commit your API keys!

### 3. Build the Plugin

```bash
npm run build
```

### 3. Start the Mock AI Server

```bash
npm run start-api
```

The mock AI server will start on `http://localhost:3001`

### 4. Load Plugin in Figma

1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select `manifest.json` from this directory
4. The plugin will appear in your plugins list

### 5. Use the Plugin

1. Create or open a Figma file
2. Select some design elements (rectangles, text, etc.)
3. Run the "CXS AI Chat Request" plugin
4. Click "Analyze Selection" to get AI suggestions
5. Review and apply the suggestions

## 📁 Project Structure

```
design-request-plugin/
├── manifest.json          # Figma plugin configuration
├── code.ts               # Main plugin logic (Figma context)
├── ui.html              # Plugin user interface
├── ui.ts                # UI logic and API communication
├── package.json         # Plugin dependencies
├── tsconfig.json        # TypeScript configuration
├── api/                 # Mock AI API server
│   ├── server.js        # Express server with mock AI
│   └── package.json     # API server dependencies
└── README.md           # This documentation
```

## 🔧 Configuration

The plugin includes a configuration panel where you can:

1. **API Endpoint**: Set your AI service URL (default: `http://localhost:3001/api/analyze`)
2. **API Key**: Optional authentication token
3. **Analysis Type**: Choose between different AI analysis modes:
   - General Design Analysis
   - Color Optimization  
   - Layout Optimization

## 🤖 AI Integration Patterns

### Pattern 1: Direct API Integration (Used in this example)

```javascript
// UI makes direct HTTP requests to AI service
const response = await fetch(apiEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(request)
});
```

**Pros**: Simple, direct communication
**Cons**: Requires CORS configuration, API key management

### Pattern 2: Proxy Server (Recommended for production)

```javascript
// Plugin → Your Proxy Server → AI Service
// Proxy handles authentication, rate limiting, etc.
```

**Pros**: Better security, centralized auth, rate limiting
**Cons**: Additional infrastructure

### Pattern 3: Serverless Functions

```javascript
// Plugin → Cloud Function → AI Service
// Use AWS Lambda, Vercel Functions, etc.
```

**Pros**: Scalable, cost-effective
**Cons**: Cold starts, execution time limits

## 🔐 Security Best Practices

### 1. API Key Management

```javascript
// ❌ Never store API keys in plugin code
const apiKey = "sk-1234567890abcdef"; // DON'T DO THIS

// ✅ Store in configuration, validate server-side
const apiKey = getUserApiKey(); // Get from secure storage
```

### 2. Input Validation

```javascript
// Validate all data before sending to AI service
function validateElementData(elements) {
  return elements.filter(el => 
    el.id && el.type && typeof el.width === 'number'
  );
}
```

### 3. Error Handling

```javascript
try {
  const response = await fetch(apiEndpoint, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return await response.json();
} catch (error) {
  console.error('AI request failed:', error);
  showErrorMessage('AI service temporarily unavailable');
}
```

## 🎨 Extending the Plugin

### Adding New AI Analysis Types

1. **Update the Analysis Types**:
```javascript
// In ui.html, add new option
<option value="accessibility-check">Accessibility Analysis</option>
```

2. **Handle New Type in Server**:
```javascript
// In api/server.js
case 'accessibility-check':
  suggestions.push(...generateAccessibilitySuggestions(element));
  break;
```

3. **Implement Analysis Logic**:
```javascript
function generateAccessibilitySuggestions(element) {
  // Your AI model logic here
  return suggestions;
}
```

### Integrating Real AI Models

Replace the mock server with your actual AI service:

#### Option 1: Custom Model API
```javascript
// Deploy your trained model as a REST API
app.post('/api/analyze', async (req, res) => {
  const result = await yourAIModel.predict(req.body.elements);
  res.json({ success: true, suggestions: result });
});
```

#### Option 2: Cloud AI Services
```javascript
// Use OpenAI, Hugging Face, etc.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: designAnalysisPrompt }]
});
```

#### Option 3: Browser-based AI
```javascript
// Use TensorFlow.js for client-side inference
import * as tf from '@tensorflow/tfjs';

const model = await tf.loadLayersModel('/path/to/model.json');
const predictions = model.predict(preprocessedData);
```

## 🧪 Testing

### Test the Mock API Server

```bash
# Health check
curl http://localhost:3001/health

# Test analysis endpoint
curl -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-api-key-12345" \
  -d '{"type":"design-analysis","data":{"elements":[{"id":"test","type":"RECTANGLE","name":"Test","width":100,"height":100}]}}'
```

### Test Plugin Integration

1. Load plugin in Figma
2. Create test elements with different properties
3. Verify suggestions are generated and applied correctly
4. Test error scenarios (network failures, invalid API keys)

## 🚀 Deployment

### Plugin Deployment

1. Build the plugin: `npm run build`
2. Submit to Figma Community or distribute privately
3. Users install from Figma Plugin Library

### AI Service Deployment

Choose your deployment platform:

- **Heroku**: Easy deployment for Node.js apps
- **Vercel**: Great for serverless functions  
- **AWS Lambda**: Scalable serverless computing
- **Google Cloud Run**: Container-based deployment
- **Custom VPS**: Full control over infrastructure

Example Vercel deployment:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy API
cd api
vercel --prod
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 Common Issues & Solutions

### CORS Errors
```javascript
// Add your domain to CORS configuration
app.use(cors({
  origin: ['https://www.figma.com', 'https://your-domain.com']
}));
```

### API Connection Failures
- Verify API endpoint URL
- Check network connectivity
- Validate API key format
- Review server logs for errors

### Plugin Not Loading
- Check `manifest.json` syntax
- Verify TypeScript compilation
- Review browser console for errors
- Ensure all required files are present

## 🔗 Additional Resources

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [Figma Plugin Best Practices](https://www.figma.com/plugin-docs/best-practices/)
- [TensorFlow.js Guide](https://www.tensorflow.org/js)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## 📄 License

MIT License - see LICENSE file for details

## 🙋‍♀️ Support

For questions and support:
1. Check existing GitHub issues
2. Review the documentation
3. Create a new issue with detailed information

---

**Happy coding! 🎨✨**

This example demonstrates the complete pattern for integrating AI models with Figma plugins. Use it as a foundation for your own AI-powered design tools!