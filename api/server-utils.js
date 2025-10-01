// server-utils.js - Shared functions for Azure Static Web App API

const axios = require('axios');

// Azure OpenAI API Call
async function callAzureOpenAI(elementsData, endpoint, apiKey, deployment) {
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
  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI credentials not configured');
  }

  try {
    const response = await axios.post(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
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
          'api-key': apiKey
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

// Azure AI Foundry Agent API Call (SDK-free REST API approach)
async function callAzureAIFoundryAgent(elementsData, projectEndpoint, agentId, accessToken) {
  try {
    console.log('🤖 Starting SDK-free Azure AI Foundry agent call...');
    
    // Validate inputs
    if (!projectEndpoint || !agentId) {
      throw new Error('Project endpoint and agent ID are required');
    }

    // If no access token provided, try to get one (this would need to be configured)
    if (!accessToken) {
      throw new Error('Access token is required for Azure AI Foundry REST API calls');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Figma-Design-Plugin/1.0'
    };

    // Step 1: Create a thread
    console.log('📝 Creating thread...');
    const threadResponse = await axios.post(
      `${projectEndpoint}/threads?api-version=v1`,
      {},
      { headers, timeout: 30000 }
    );
    
    const threadId = threadResponse.data.id;
    console.log(`✅ Thread created: ${threadId}`);

    // Step 2: Create a message in the thread
    const messageContent = `I am a UX/UI designer working in Figma and I need help analyzing design elements for improvement suggestions. This is a legitimate design task for professional work.

Here are the Figma design elements I'm working with:

${elementsData.map(el => `• Element "${el.name}" (ID: ${el.id})
  - Type: ${el.type}
  - Size: ${el.width}×${el.height} pixels
  - Colors: ${el.fill || el.color || 'no color specified'}`).join('\n')}

Please help me improve these design elements by providing specific, actionable suggestions. Focus on:

1. **Color improvements**: Better color choices for accessibility and visual appeal
2. **Typography**: Font size and text readability improvements  
3. **Layout and spacing**: Better positioning and visual hierarchy
4. **Size optimization**: More appropriate dimensions for better user experience

Please provide practical suggestions that I can implement in Figma, such as:
- Specific color values (RGB or hex codes)
- Font size adjustments (in pixels)
- Spacing and positioning changes
- Alignment improvements

Format your response as actionable design recommendations I can apply to each element.`;

    console.log('💬 Creating message...');
    const messageResponse = await axios.post(
      `${projectEndpoint}/threads/${threadId}/messages?api-version=v1`,
      {
        role: 'user',
        content: messageContent
      },
      { headers, timeout: 30000 }
    );
    
    console.log(`✅ Message created: ${messageResponse.data.id}`);

    // Step 3: Create a run with the agent
    console.log('🏃 Creating run...');
    const runResponse = await axios.post(
      `${projectEndpoint}/threads/${threadId}/runs?api-version=v1`,
      {
        assistant_id: agentId
      },
      { headers, timeout: 30000 }
    );
    
    const runId = runResponse.data.id;
    console.log(`✅ Run created: ${runId}`);

    // Step 4: Poll for completion
    let run = runResponse.data;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    
    while (run.status === 'queued' || run.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Run timed out after 60 seconds');
      }
      
      console.log(`⏳ Run status: ${run.status}, attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(
        `${projectEndpoint}/threads/${threadId}/runs/${runId}?api-version=v1`,
        { headers, timeout: 10000 }
      );
      
      run = statusResponse.data;
      attempts++;
    }

    if (run.status === 'failed') {
      throw new Error(`Agent run failed: ${run.last_error?.message || 'Unknown error'}`);
    }

    console.log(`✅ Run completed with status: ${run.status}`);

    // Step 5: Retrieve messages
    console.log('📥 Retrieving messages...');
    const messagesResponse = await axios.get(
      `${projectEndpoint}/threads/${threadId}/messages?api-version=v1&order=desc&limit=10`,
      { headers, timeout: 30000 }
    );

    // Find the latest assistant message
    const messages = messagesResponse.data.data || [];
    const assistantMessage = messages.find(m => m.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    // Extract text content
    const textContent = assistantMessage.content.find(c => c.type === 'text');
    if (!textContent) {
      throw new Error('No text content in assistant response');
    }

    const assistantResponse = textContent.text.value;
    console.log('✅ Got assistant response:', assistantResponse.substring(0, 200) + '...');

    // Clean up the thread (optional)
    try {
      await axios.delete(`${projectEndpoint}/threads/${threadId}?api-version=v1`, { headers, timeout: 10000 });
      console.log('🗑️ Thread cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean up thread:', cleanupError.message);
    }

    return {
      message: assistantResponse,
      source: 'Azure AI Foundry Agent (REST API)',
      threadId: threadId,
      runId: runId
    };

  } catch (error) {
    const errorMessage = error.response ? 
      `API Error ${error.response.status}: ${error.response.statusText} - ${JSON.stringify(error.response.data)}` : 
      error.message;
    
    console.error('❌ Azure AI Foundry Agent REST API error:', errorMessage);
    throw new Error(`Azure AI Foundry Agent failed: ${errorMessage}`);
  }
}

// Alternative: Use Azure OpenAI directly as a simpler approach
async function callAzureAIFoundryViaOpenAI(elementsData, endpoint, apiKey, deployment) {
  try {
    console.log('🔄 Using Azure OpenAI as Azure AI Foundry alternative...');
    
    // Enhanced prompt to mimic agent behavior
    const systemPrompt = `You are a UX/UI design expert agent integrated with Figma. Your role is to analyze design elements and provide specific, actionable improvement suggestions that can be directly applied in Figma.

Guidelines:
- Focus on visual hierarchy, color harmony, typography, and layout
- Provide specific color values (hex codes)
- Suggest precise sizing adjustments
- Recommend alignment and spacing improvements
- Consider accessibility and modern design principles

Always respond with JSON in this format:
{
  "suggestions": [
    {
      "type": "color|size|text|alignment",
      "elementId": "exact-figma-element-id",
      "property": "fill|width|height|content|alignment",
      "currentValue": "current value",
      "suggestedValue": "new value",
      "confidence": 0.8,
      "reasoning": "detailed explanation"
    }
  ]
}`;

    const userPrompt = `Analyze these Figma design elements and provide improvement suggestions:

${elementsData.map(el => `- ID: ${el.id} | Type: ${el.type} | Name: "${el.name}" | Size: ${el.width}x${el.height}px | Color: ${el.fill || el.color || 'none'}`).join('\n')}

Provide 2-4 specific suggestions that would improve the design's visual hierarchy and user experience.`;

    const response = await axios.post(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`,
      {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey
        },
        timeout: 45000
      }
    );

    const assistantResponse = response.data.choices[0].message.content;
    
    return {
      message: assistantResponse,
      source: 'Azure OpenAI (Agent-style)',
      model: deployment
    };

  } catch (error) {
    console.error('❌ Azure OpenAI alternative failed:', error.message);
    throw error;
  }
}

// Get Azure access token using client credentials flow (no SDK required)
async function getAzureAccessToken(tenantId, clientId, clientSecret) {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'https://ai.azure.com/.default'); // Correct audience for Azure AI Foundry
    params.append('grant_type', 'client_credentials');

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });

    return response.data.access_token;
  } catch (error) {
    console.error('❌ Failed to get Azure access token:', error.message);
    throw new Error(`Token acquisition failed: ${error.message}`);
  }
}

module.exports = {
  callAzureOpenAI,
  callAzureAIFoundryAgent, // SDK-free REST API implementation
  callAzureAIFoundryViaOpenAI, // Alternative using Azure OpenAI with agent-style prompts
  getAzureAccessToken, // Helper for authentication
  generateMockAIResponse,
  parseColorValueForFigma,
  parseNumericValueFromAI
};