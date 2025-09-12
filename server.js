require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - More permissive CORS for Figma plugin development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Figma plugins, or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow Figma domains
    if (origin.includes('figma.com')) return callback(null, true);
    
    // Allow file:// protocol for local development
    if (origin.startsWith('file://')) return callback(null, true);
    
    // For development, allow all origins (remove this in production)
    console.log('🌍 CORS allowing origin:', origin);
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Access-Control-Allow-Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Configuration
const USE_REAL_AI = process.env.USE_REAL_AI === 'true';
const FALLBACK_TO_MOCK = process.env.FALLBACK_TO_MOCK !== 'false';

console.log('🔧 Configuration:', USE_REAL_AI ? 'Real Azure OpenAI (with mock fallback)' : 'Mock AI Only');

// Azure OpenAI Configuration with validation
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

// Validate credentials and determine if real AI is available
let REAL_AI_AVAILABLE = false;
if (USE_REAL_AI) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
    console.log('⚠️  Azure OpenAI credentials incomplete - falling back to mock AI');
    console.log('⚠️  Missing:', [
      !AZURE_OPENAI_ENDPOINT && 'ENDPOINT',
      !AZURE_OPENAI_API_KEY && 'API_KEY', 
      !AZURE_OPENAI_DEPLOYMENT && 'DEPLOYMENT_NAME'
    ].filter(Boolean).join(', '));
    REAL_AI_AVAILABLE = false;
  } else {
    REAL_AI_AVAILABLE = true;
    console.log('✅ Azure OpenAI credentials validated');
  }
} else {
  console.log('🎭 Mock AI mode - real AI disabled');
}

// Helper functions
function parseColorValueForFigma(colorStr) {
  if (!colorStr) return null;
  
  // Handle hex colors
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b };
    }
  }
  
  // Handle rgb() colors
  const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]) / 255,
      g: parseInt(rgbMatch[2]) / 255,
      b: parseInt(rgbMatch[3]) / 255
    };
  }
  
  return null;
}

function parseNumericValueFromAI(value) {
  if (typeof value === 'number') return value;
  const str = String(value);
  const match = str.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

// Enhanced AI Analysis with Real Azure OpenAI
async function callAzureOpenAI(elementsData) {
  const prompt = `Analyze the following Figma design elements and suggest improvements. Focus on color, size, typography, and alignment. Provide specific, actionable suggestions.

Elements:
${elementsData.map(el => `- ID: ${el.id} | ${el.type} "${el.name}" (${el.width}x${el.height}, ${el.fill || el.color || 'no color'})`).join('\n')}

IMPORTANT RULES:
1. Only suggest color changes that are visually different (avoid same RGB values)
2. For size changes, suggest meaningful improvements (10-30% changes)  
3. For text, suggest proper capitalization and readability improvements
4. For alignment, be specific about horizontal/vertical positioning
5. CRITICAL: Use the exact ID provided above for each element (starts with numbers/letters like "123:456")

Respond in this exact JSON format:
{
  "suggestions": [
    {
      "type": "color|size|text|general",
      "elementId": "USE EXACT ID FROM ABOVE (like 123:456)", 
      "property": "fill|width|height|content|alignment",
      "currentValue": "current value",
      "suggestedValue": "new value",
      "confidence": 0.8,
      "reasoning": "why this change improves the design"
    }
  ]
}`;

  // Validate credentials before making the call
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
    throw new Error('Azure OpenAI credentials not configured');
  }

  try {
    const response = await axios.post(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-01`,
      {
        messages: [
          {
            role: "system", 
            content: "You are a UX/UI design expert. Analyze designs and suggest specific improvements for better visual hierarchy, readability, and user experience. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY
        },
        timeout: 30000  // 30 second timeout
      }
    );

    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response structure from Azure OpenAI');
    }

    return response.data.choices[0].message.content;
  } catch (error) {
    const errorMsg = error.response ? 
      `API Error ${error.response.status}: ${error.response.statusText}` : 
      error.message;
    console.log('🔄 Azure OpenAI failed:', errorMsg);
    throw error;
  }
}

// Mock AI Response - Safe fallback that never fails
function generateMockAIResponse(elementsData) {
  const suggestions = [];
  
  try {
    // Ensure elementsData is an array
    const elements = Array.isArray(elementsData) ? elementsData : [];
    
    // Always provide at least one suggestion even if no elements
    if (elements.length === 0) {
      suggestions.push({
        type: "general",
        elementId: "no-selection",
        property: "selection",
        currentValue: "No elements selected",
        suggestedValue: "Select elements to get AI suggestions",
        confidence: 1.0,
        reasoning: "Please select design elements in Figma to receive AI-powered suggestions."
      });
      return { suggestions };
    }
  
    elements.forEach((element, index) => {
      // Safely access element properties with defaults
      const elementType = element?.type || 'UNKNOWN';
      const elementName = element?.name || `Element ${index + 1}`;
      const elementId = element?.id || `mock-${index}`;
      const elementWidth = element?.width || 0;
      const elementHeight = element?.height || 0;
      
      // Mock color suggestion using actual element ID - suggest colors for fillable elements
      if (elementType === 'RECTANGLE' || elementType === 'ELLIPSE' || elementType === 'POLYGON' || 
          elementType === 'SHAPE_WITH_TEXT' || elementType === 'FRAME' || elementType === 'COMPONENT') {
        const currentFill = element.fill && element.fill !== 'none' ? element.fill : 'no color';
        const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#7ED321'];
        const randomColor = colors[index % colors.length];
        
        suggestions.push({
          type: "color",
          elementId: elementId, // Use actual Figma ID
          property: "fill",
          currentValue: currentFill,
          suggestedValue: randomColor,
          confidence: 0.8,
          reasoning: `${currentFill === 'no color' ? 'Adding' : 'Updating'} color for "${elementName}" to improve visual hierarchy and design cohesion.`
        });
      }
    
      // Mock size suggestion using actual element ID
      if (elementWidth && elementHeight) {
        suggestions.push({
          type: "size",
          elementId: elementId, // Use actual Figma ID
          property: "width",
          currentValue: elementWidth.toString(),
          suggestedValue: Math.round(elementWidth * 1.2),
          confidence: 0.9,
          reasoning: `Increased width for "${elementName}" for better visual balance and improved readability.`
        });
      }
      
      // Mock text suggestion using actual element ID
      if (elementType === 'TEXT' && elementName) {
        suggestions.push({
          type: "text", 
          elementId: elementId, // Use actual Figma ID
          property: "content",
          currentValue: elementName,
          suggestedValue: elementName.charAt(0).toUpperCase() + elementName.slice(1).toLowerCase(),
          confidence: 0.85,
          reasoning: `Improved capitalization for "${elementName}" for better readability and modern typography standards.`
        });
      }
    });
    
  } catch (error) {
    // Fallback for any errors in mock generation
    console.log('⚠️ Error in mock response generation:', error.message);
    suggestions.push({
      type: "general",
      elementId: "fallback",
      property: "analysis",
      currentValue: "Error occurred",
      suggestedValue: "Fallback suggestion",
      confidence: 0.5,
      reasoning: "A fallback suggestion due to an error in analysis."
    });
  }
  
  return { suggestions };
}

// Routes
app.get('/health', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json({ 
    status: 'healthy',
    message: 'CXS AI Chat Request API is running',
    timestamp: new Date().toISOString()
  });
});

// Handle preflight OPTIONS requests for /api/analyze
app.options('/api/analyze', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.sendStatus(200);
});

app.post('/api/analyze', async (req, res) => {
  // Set explicit CORS headers for this endpoint
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  
  try {
    // Handle both direct elements array and nested data structure
    const { elements: directElements, type, data } = req.body;
    const elements = directElements || data?.elements;
    const requestType = type || req.body.type;
    
    console.log('🔗 Received AI analysis request:', { 
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      requestType, 
      elementsCount: elements?.length,
      hasDirectElements: !!directElements,
      hasNestedElements: !!data?.elements,
      authenticated: !!req.headers['x-api-key'],
      requestBody: Object.keys(req.body)
    });
    
    if (!elements || !Array.isArray(elements)) {
      console.log('❌ Invalid elements array:', { elements, type: typeof elements, isArray: Array.isArray(elements) });
      return res.status(400).json({ 
        error: 'Invalid request: elements array is required',
        received: {
          elementsType: typeof elements,
          elementsLength: elements?.length,
          bodyKeys: Object.keys(req.body)
        }
      });
    }

    let aiResponse;
    
    // Try real AI first if available and configured
    if (REAL_AI_AVAILABLE) {
      try {
        console.log('🤖 Attempting Azure OpenAI request...');
        const rawResponse = await callAzureOpenAI(elements);
        console.log('🔍 DEBUG: Raw AI response received');
        
        // Clean and parse the response
        let cleanedResponse = rawResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        }
        
        console.log('🔍 DEBUG: Parsing AI response...');
        aiResponse = JSON.parse(cleanedResponse);
        console.log('✅ Azure OpenAI response parsed successfully');
        
      } catch (aiError) {
        console.log('🔄 Azure OpenAI failed, using mock fallback:', aiError.message);
        // Always use mock fallback on any error to prevent server crashes
        aiResponse = generateMockAIResponse(elements);
      }
    } else {
      // Use mock AI (credentials not available or disabled)
      console.log('🎭 Using mock AI response');
      aiResponse = generateMockAIResponse(elements);
    }

    // Map element descriptions to actual IDs with improved matching
    console.log('🔍 DEBUG: Available elements:', elements.map(el => ({ id: el.id, name: el.name, type: el.type })));
    
    const enhancedSuggestions = aiResponse.suggestions.map((suggestion, suggestionIndex) => {
      let matchingElement = null;
      
      // Strategy 1: Direct Figma ID match (for real AI responses)
      if (suggestion.elementId && suggestion.elementId.includes(':')) {
        matchingElement = elements.find(el => el.id === suggestion.elementId);
        if (matchingElement) {
          console.log('🎯 MATCHED by direct ID:', suggestion.elementId, '→', matchingElement.name);
        }
      }
      
      // Strategy 2: Exact name match within quotes (for mock responses like 'TEXT "Button"')
      if (!matchingElement) {
        const nameMatch = suggestion.elementId.match(/"([^"]+)"/);
        if (nameMatch) {
          const extractedName = nameMatch[1];
          matchingElement = elements.find(el => el.name === extractedName);
          if (matchingElement) {
            console.log('🎯 MATCHED by quoted name:', extractedName, '→', matchingElement.id);
          }
        }
      }
      
      // Strategy 3: Partial name match (existing logic)
      if (!matchingElement) {
        matchingElement = elements.find(el => 
          suggestion.elementId.includes(el.name) || 
          suggestion.elementId.includes(el.type)
        );
        if (matchingElement) {
          console.log('🎯 MATCHED by partial match:', suggestion.elementId, '→', matchingElement.name);
        }
      }
      
      // Strategy 4: Round-robin assignment to prevent all going to first element
      if (!matchingElement && elements.length > 0) {
        const targetIndex = suggestionIndex % elements.length;
        matchingElement = elements[targetIndex];
        console.log('⚠️ NO MATCH FOUND - Using round-robin assignment:', suggestion.elementId, '→ Element', targetIndex, '(', matchingElement.name, ')');
      }
      
      console.log('🔍 DEBUG: Suggestion', suggestionIndex, '- AI elementId:', suggestion.elementId, 'Final mapping:', matchingElement?.id, '(', matchingElement?.name, ')');
      
      // Process color values
      if (suggestion.type === 'color') {
        const colorValue = parseColorValueForFigma(suggestion.suggestedValue);
        console.log('🎨 DEBUG: Color parsing - Input:', suggestion.suggestedValue, 'Output:', colorValue);
        
        // Check if color is meaningfully different
        if (colorValue && suggestion.currentValue) {
          const currentColor = parseColorValueForFigma(suggestion.currentValue);
          if (currentColor) {
            const colorDiff = Math.abs(currentColor.r - colorValue.r) + 
                            Math.abs(currentColor.g - colorValue.g) + 
                            Math.abs(currentColor.b - colorValue.b);
            console.log('🎨 DEBUG: Skipping identical color suggestion - difference:', colorDiff);
            if (colorDiff < 0.01) return null; // Skip nearly identical colors
          }
        }
        
        return {
          ...suggestion,
          elementId: matchingElement?.id,
          suggestedValue: colorValue
        };
      }
      
      // Process size values
      if (suggestion.type === 'size') {
        const sizeValue = parseNumericValueFromAI(suggestion.suggestedValue);
        console.log('📏 DEBUG: Size parsing - Input:', suggestion.suggestedValue, 'Output:', sizeValue);
        return {
          ...suggestion,
          elementId: matchingElement?.id,
          suggestedValue: sizeValue
        };
      }
      
      return {
        ...suggestion,
        elementId: matchingElement?.id
      };
    }).filter(suggestion => suggestion !== null);
    
    console.log('🔍 DEBUG: Enhanced suggestions (after filtering):', enhancedSuggestions);
    
    res.json({ suggestions: enhancedSuggestions });
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Always provide a fallback response to prevent total failure
    const fallbackResponse = {
      success: true,
      suggestions: generateMockAIResponse(elements || []).suggestions || [],
      message: 'Using fallback analysis due to error'
    };
    
    res.status(200).json(fallbackResponse);
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🤖 CXS AI Chat Request API running on port ${PORT}`);
  console.log(`🧠 AI Mode: ${USE_REAL_AI ? '✨ Real Azure OpenAI (with fallback)' : '🎭 Mock AI Only'}`);
  console.log(`� Plugin endpoint: http://localhost:${PORT}/api/analyze`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  
  if (USE_REAL_AI) {
    console.log('');
    console.log(`⚙️  Azure OpenAI Configuration:`);
    console.log(`   Endpoint: ${AZURE_OPENAI_ENDPOINT ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API Key: ${AZURE_OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Deployment: ${AZURE_OPENAI_DEPLOYMENT ? '✅ Set' : '❌ Missing'}`);
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close other applications using this port.`);
  }
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
});