// Server modification to support anonymous access for Azure AI Foundry agents
// Add this to your existing server.js file

// NEW ROUTE: Anonymous endpoint for Azure AI Foundry agents
app.post('/api/analyze-anonymous', async (req, res) => {
  // Set CORS headers for Azure AI Foundry
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  
  try {
    console.log('🤖 Anonymous AI Foundry request received:', {
      origin: req.headers.origin,
      userAgent: req.headers['user-agent'],
      bodyKeys: Object.keys(req.body)
    });

    // Handle both direct elements array and nested data structure  
    const { elements: directElements, type, data } = req.body;
    const elements = directElements || data?.elements || [];
    const requestType = type || 'design-analysis';
    
    console.log('📊 Processing elements:', {
      count: elements?.length,
      type: requestType,
      sampleElement: elements?.[0]
    });
    
    if (!elements || !Array.isArray(elements)) {
      return res.status(400).json({ 
        error: 'Invalid request: elements array is required',
        received: {
          elementsType: typeof elements,
          elementsLength: elements?.length,
          bodyStructure: Object.keys(req.body)
        }
      });
    }

    let aiResponse;
    
    // Try real AI first if available and configured
    if (REAL_AI_AVAILABLE) {
      try {
        console.log('🤖 Attempting Azure OpenAI request for Foundry agent...');
        const rawResponse = await callAzureOpenAI(elements);
        
        // Clean and parse the response
        let cleanedResponse = rawResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
        }
        
        aiResponse = JSON.parse(cleanedResponse);
        console.log('✅ Azure OpenAI response for Foundry agent successful');
        
      } catch (aiError) {
        console.log('🔄 Azure OpenAI failed for Foundry agent, using mock fallback:', aiError.message);
        aiResponse = generateMockAIResponse(elements);
      }
    } else {
      console.log('🎭 Using mock AI response for Foundry agent');
      aiResponse = generateMockAIResponse(elements);
    }

    // Enhanced suggestion mapping for Azure AI Foundry agents
    const enhancedSuggestions = aiResponse.suggestions.map((suggestion, index) => {
      let matchingElement = null;
      
      // Try to find matching element by ID, name, or type
      if (suggestion.elementId && suggestion.elementId.includes(':')) {
        matchingElement = elements.find(el => el.id === suggestion.elementId);
      }
      
      if (!matchingElement) {
        const nameMatch = suggestion.elementId?.match(/"([^"]+)"/);
        if (nameMatch) {
          matchingElement = elements.find(el => el.name === nameMatch[1]);
        }
      }
      
      if (!matchingElement && elements.length > 0) {
        matchingElement = elements[index % elements.length];
      }
      
      // Process different suggestion types
      if (suggestion.type === 'color') {
        const colorValue = parseColorValueForFigma(suggestion.suggestedValue);
        return {
          ...suggestion,
          elementId: matchingElement?.id,
          suggestedValue: colorValue || suggestion.suggestedValue
        };
      }
      
      if (suggestion.type === 'size') {
        const sizeValue = parseNumericValueFromAI(suggestion.suggestedValue);
        return {
          ...suggestion,
          elementId: matchingElement?.id,
          suggestedValue: sizeValue || suggestion.suggestedValue
        };
      }
      
      return {
        ...suggestion,
        elementId: matchingElement?.id
      };
    }).filter(suggestion => suggestion !== null);

    console.log('🎯 Foundry agent response prepared:', {
      originalCount: aiResponse.suggestions.length,
      enhancedCount: enhancedSuggestions.length,
      sampleSuggestion: enhancedSuggestions[0]
    });
    
    // Response format optimized for Azure AI Foundry agents
    const response = {
      success: true,
      suggestions: enhancedSuggestions,
      metadata: {
        elementsAnalyzed: elements.length,
        analysisType: requestType,
        timestamp: new Date().toISOString(),
        source: 'CXS AI Design Request Plugin'
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Anonymous analysis error:', error.message);
    
    // Always provide a fallback response for Azure AI Foundry agents
    const fallbackResponse = {
      success: false,
      error: error.message,
      suggestions: generateMockAIResponse(elements || []).suggestions || [],
      metadata: {
        fallback: true,
        timestamp: new Date().toISOString()
      }
    };
    
    res.status(200).json(fallbackResponse);
  }
});

// OPTIONS handler for CORS preflight
app.options('/api/analyze-anonymous', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.sendStatus(200);
});

console.log('🔗 Azure AI Foundry anonymous endpoint configured at /api/analyze-anonymous');