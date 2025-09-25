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

// Azure AI Foundry Agent API Call (server-side with DefaultAzureCredential)
async function callAzureAIFoundryAgent(elementsData, endpoint, apiKey) {
  try {
    // Try to import Azure SDK - if it fails, we'll throw and fall back to direct OpenAI
    const { AIProjectClient } = require("@azure/ai-projects");
    const { DefaultAzureCredential } = require("@azure/identity");

    const projectEndpoint = "https://wmdefault-2478-resource.services.ai.azure.com/api/projects/wmdefault-2478";
    const agentId = "asst_qrwJB85AgguLd3cIPJjF86Nv";

    // Use Azure SDK with DefaultAzureCredential (works in Azure environment)
    const project = new AIProjectClient(projectEndpoint, new DefaultAzureCredential());
    
    // Get the agent
    const agent = await project.agents.getAgent(agentId);
    console.log(`Retrieved agent: ${agent.name}`);

    // Create a thread
    const thread = await project.agents.threads.create();
    console.log(`Created thread, ID: ${thread.id}`);

    // Create message with design analysis request
    const messageContent = `Please analyze these Figma design elements and provide specific improvement suggestions:

${elementsData.map(el => `- ID: ${el.id} | ${el.type} "${el.name}" (${el.width}x${el.height}, ${el.fill || el.color || 'no color'})`).join('\n')}

Focus on:
1. Color harmony and accessibility
2. Typography and readability  
3. Layout and spacing
4. Visual hierarchy

Provide actionable suggestions that a designer can implement.`;

    const message = await project.agents.messages.create(thread.id, "user", messageContent);
    console.log(`Created message, ID: ${message.id}`);

    // Create run
    let run = await project.agents.runs.create(thread.id, agent.id);

    // Poll until the run reaches a terminal status
    while (run.status === "queued" || run.status === "in_progress") {
      // Wait for a second
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await project.agents.runs.get(thread.id, run.id);
    }

    if (run.status === "failed") {
      throw new Error(`Agent run failed: ${run.lastError}`);
    }

    console.log(`Run completed with status: ${run.status}`);

    // Retrieve messages
    const messages = await project.agents.messages.list(thread.id, { order: "asc" });

    // Find assistant response
    let assistantResponse = null;
    for await (const m of messages) {
      if (m.role === 'assistant') {
        const content = m.content.find((c) => c.type === "text" && "text" in c);
        if (content) {
          assistantResponse = content.text.value;
          break;
        }
      }
    }

    if (!assistantResponse) {
      throw new Error('No response from agent');
    }

    // Parse the response and structure it for the frontend
    return {
      suggestions: [], // You might want to parse suggestions from the text response
      message: assistantResponse,
      source: 'Azure AI Foundry Agent'
    };

  } catch (error) {
    console.error('Azure AI Foundry Agent error (will fall back to direct OpenAI):', error);
    // Re-throw to trigger fallback in the calling function
    throw error;
  }
}

module.exports = {
  callAzureOpenAI,
  callAzureAIFoundryAgent,
  generateMockAIResponse,
  parseColorValueForFigma,
  parseNumericValueFromAI
};