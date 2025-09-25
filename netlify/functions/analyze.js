// netlify/functions/analyze.js
// Netlify Edge Function version of your server.js

export default async (request, context) => {
  // Handle CORS for Figma
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
      }
    });
  }

  try {
    const { elements, type } = await request.json();
    
    // Validate request
    if (!elements || !Array.isArray(elements)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request: elements array is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 Processing ${elements.length} elements`);

    // Call Azure OpenAI directly (no server needed!)
    const aiResponse = await callAzureOpenAI(elements);
    
    return new Response(JSON.stringify({ suggestions: aiResponse.suggestions }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Fallback to mock response (never fails completely)
    const mockResponse = generateMockAIResponse(elements || []);
    
    return new Response(JSON.stringify({ 
      suggestions: mockResponse.suggestions,
      message: 'Using fallback analysis'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

// Your existing Azure OpenAI logic (unchanged)
async function callAzureOpenAI(elementsData) {
  const prompt = `Analyze the following Figma design elements and suggest improvements. Focus on color, size, typography, and alignment.

Elements:
${elementsData.map(el => `- ID: ${el.id} | ${el.type} "${el.name}" (${el.width}x${el.height})`).join('\n')}

Respond in this exact JSON format:
{
  "suggestions": [
    {
      "type": "color|size|text|general",
      "elementId": "USE EXACT ID FROM ABOVE",
      "property": "fill|width|height|content|alignment", 
      "currentValue": "current value",
      "suggestedValue": "new value",
      "confidence": 0.8,
      "reasoning": "why this change improves the design"
    }
  ]
}`;

  const response = await fetch(
    `${Netlify.env.get('AZURE_OPENAI_ENDPOINT')}/openai/deployments/${Netlify.env.get('AZURE_OPENAI_DEPLOYMENT')}/chat/completions?api-version=2024-02-01`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': Netlify.env.get('AZURE_OPENAI_API_KEY')
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a UX/UI design expert. Analyze designs and suggest specific improvements. Always respond with valid JSON."
          },
          {
            role: "user", 
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Azure OpenAI API failed: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  // Clean JSON response
  if (content.startsWith('```json')) {
    content = content.replace(/```json\n?/, '').replace(/\n?```$/, '');
  }
  
  return JSON.parse(content);
}

// Your existing mock AI logic (unchanged) 
function generateMockAIResponse(elementsData) {
  const suggestions = [];
  
  if (elementsData.length === 0) {
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

  elementsData.forEach((element, index) => {
    const elementType = element?.type || 'UNKNOWN';
    const elementId = element?.id || `mock-${index}`;
    const elementWidth = element?.width || 0;
    
    // Mock color suggestion for fillable elements
    if (['RECTANGLE', 'ELLIPSE', 'FRAME', 'COMPONENT'].includes(elementType)) {
      const colors = ['#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#7ED321'];
      const randomColor = colors[index % colors.length];
      
      suggestions.push({
        type: "color",
        elementId: elementId,
        property: "fill",
        currentValue: element.fill || 'no color',
        suggestedValue: randomColor,
        confidence: 0.8,
        reasoning: `Improved color for "${element.name || 'Element'}" to enhance visual hierarchy.`
      });
    }
    
    // Mock size suggestion
    if (elementWidth > 0) {
      suggestions.push({
        type: "size",
        elementId: elementId,
        property: "width", 
        currentValue: elementWidth.toString(),
        suggestedValue: Math.round(elementWidth * 1.2),
        confidence: 0.9,
        reasoning: `Increased width for better visual balance.`
      });
    }
  });
  
  return { suggestions };
}