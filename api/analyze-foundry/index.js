const { 
    callAzureAIFoundryAgent, 
    callAzureAIFoundryViaOpenAI,
    getAzureAccessToken,
    generateMockAIResponse, 
    parseColorValueForFigma, 
    parseNumericValueFromAI 
} = require('../server-utils');

module.exports = async function (context, req) {
    // Set CORS headers IMMEDIATELY for Figma plugin - most permissive possible
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Expose-Headers": "*",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "false"
    };
    
    // Set headers immediately
    context.res = {
        headers: corsHeaders
    };
    
    context.log('Azure AI Foundry API function triggered.');
    
    try {

        // Handle OPTIONS request for CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: corsHeaders,
                body: {}
            };
            context.done();
            return;
        }

        // Get request body
        const { elements: directElements, type, data } = req.body;
        const elements = directElements || data?.elements || [];
        const requestType = type || 'design-analysis';
        
        context.log(`Processing ${elements.length} elements for Azure AI Foundry agent analysis`);
        
        if (!elements || !Array.isArray(elements)) {
            context.res.status = 400;
            context.res.body = { 
                error: 'Invalid request: elements array is required',
                received: {
                    elementsType: typeof elements,
                    elementsLength: elements?.length,
                    bodyKeys: Object.keys(req.body)
                }
            };
            return;
        }

        // Configuration for Azure AI Foundry - multiple approaches
        const PROJECT_ENDPOINT = process.env.AZURE_AI_PROJECT_ENDPOINT;
        const AGENT_ID = process.env.AZURE_AI_AGENT_ID;
        
        // Authentication options
        const TENANT_ID = process.env.AZURE_TENANT_ID;
        const CLIENT_ID = process.env.AZURE_CLIENT_ID;
        const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
        
        // Fallback to Azure OpenAI
        const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
        const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
        const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        
        let aiResponse;
        
        // Try Azure AI Foundry approaches
        if (PROJECT_ENDPOINT && AGENT_ID) {
            try {
                context.log('🤖 Attempting SDK-free Azure AI Foundry agent request...');
                
                let rawResponse;
                
                // Approach 1: Direct REST API to Azure AI Foundry (if we have auth)
                if (TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
                    try {
                        context.log('🔑 Getting Azure access token...');
                        const accessToken = await getAzureAccessToken(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
                        context.log('✅ Access token obtained, calling Foundry agent...');
                        
                        rawResponse = await callAzureAIFoundryAgent(elements, PROJECT_ENDPOINT, AGENT_ID, accessToken);
                        context.log('✅ Azure AI Foundry REST API call successful');
                    } catch (restError) {
                        context.log(`❌ Foundry REST API failed: ${restError.message}`);
                        throw restError; // Fall through to next approach
                    }
                } 
                
                // Approach 2: Use Azure OpenAI with agent-style prompting if Foundry failed
                if (!rawResponse && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY && AZURE_OPENAI_DEPLOYMENT) {
                    context.log('🔄 Falling back to Azure OpenAI with agent-style prompts...');
                    rawResponse = await callAzureAIFoundryViaOpenAI(elements, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT);
                    context.log('✅ Azure OpenAI agent-style call successful');
                }
                
                if (rawResponse) {
                    // Parse the response from the agent and structure it for Figma
                    aiResponse = parseFoundryAgentResponse(rawResponse, elements);
                    context.log('✅ Agent response parsed successfully');
                } else {
                    throw new Error('No valid response from any Foundry approach');
                }
                
            } catch (aiError) {
                context.log(`❌ All Azure AI Foundry approaches failed: ${aiError.message}`);
                context.log('🔄 Using mock fallback...');
                aiResponse = generateMockAIResponse(elements);
            }
        } else {
            context.log('⚠️ Azure AI Foundry not configured (missing PROJECT_ENDPOINT or AGENT_ID)');
            context.log('🔄 Using mock AI response');
            aiResponse = generateMockAIResponse(elements);
        }

        // Process suggestions to ensure proper element IDs and value formats
        const enhancedSuggestions = aiResponse.suggestions.map((suggestion, index) => {
            let matchingElement = null;
            
            // Find matching element using various strategies
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
            
            // Process color values
            if (suggestion.type === 'color') {
                const colorValue = parseColorValueForFigma(suggestion.suggestedValue);
                return {
                    ...suggestion,
                    elementId: matchingElement?.id,
                    suggestedValue: colorValue || suggestion.suggestedValue
                };
            }
            
            // Process size values
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

        // Response format
        context.res.status = 200;
        context.res.body = {
            success: true,
            suggestions: enhancedSuggestions,
            source: 'Azure AI Foundry Agent'
        };
        
    } catch (error) {
        context.log.error(`Azure AI Foundry analysis error: ${error.message}`);
        
        // Always provide a fallback response
        context.res.status = 200;
        context.res.body = {
            success: true,
            suggestions: generateMockAIResponse([]).suggestions || [],
            message: 'Using fallback analysis due to Azure AI Foundry error',
            source: 'Mock Fallback'
        };
    }
};

// Parse Azure AI Foundry agent response into structured format
function parseFoundryAgentResponse(foundryResponse, elements) {
    try {
        // The foundry response might be natural language or already structured
        if (foundryResponse.suggestions && Array.isArray(foundryResponse.suggestions)) {
            return foundryResponse; // Already structured
        }
        
        // Parse natural language response from agent
        const message = foundryResponse.message || foundryResponse;
        const suggestions = [];
        
        // Enhanced parsing logic for Azure AI Foundry responses
        const lines = message.split('\n');
        
        // Create element lookup for better matching
        const elementMap = new Map();
        elements.forEach(el => {
            elementMap.set(el.name.toLowerCase(), el);
            elementMap.set(el.id, el);
        });
        
        for (const line of lines) {
            const lowerLine = line.toLowerCase().trim();
            
            // Extract color suggestions with hex codes
            const colorMatch = line.match(/#([0-9a-f]{6})/i) || line.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
            if (colorMatch && (lowerLine.includes('color') || lowerLine.includes('fill') || lowerLine.includes('background'))) {
                let targetElement = null;
                
                // Find which element this color suggestion is for
                for (const [name, element] of elementMap) {
                    if (lowerLine.includes(name) || lowerLine.includes(element.type.toLowerCase())) {
                        targetElement = element;
                        break;
                    }
                }
                
                if (!targetElement && elements.length > 0) {
                    targetElement = elements.find(el => el.type !== 'TEXT') || elements[0];
                }
                
                if (targetElement) {
                    let suggestedColor = colorMatch[0];
                    if (colorMatch[0].startsWith('rgb')) {
                        // Convert RGB to normalized values for Figma
                        const r = parseInt(colorMatch[1]) / 255;
                        const g = parseInt(colorMatch[2]) / 255; 
                        const b = parseInt(colorMatch[3]) / 255;
                        suggestedColor = { r, g, b };
                    } else {
                        // Convert hex to Figma format
                        const hex = colorMatch[1];
                        const r = parseInt(hex.slice(0, 2), 16) / 255;
                        const g = parseInt(hex.slice(2, 4), 16) / 255;
                        const b = parseInt(hex.slice(4, 6), 16) / 255;
                        suggestedColor = { r, g, b };
                    }
                    
                    suggestions.push({
                        type: 'color',
                        elementId: targetElement.id,
                        property: 'fill',
                        currentValue: targetElement.fill || '#FFFFFF',
                        suggestedValue: suggestedColor,
                        confidence: 0.9,
                        reasoning: line.trim()
                    });
                }
            }
            
            // Extract size suggestions with pixel values
            const sizeMatch = line.match(/(\d+)px/g);
            if (sizeMatch && (lowerLine.includes('width') || lowerLine.includes('height') || lowerLine.includes('size'))) {
                let targetElement = null;
                
                for (const [name, element] of elementMap) {
                    if (lowerLine.includes(name)) {
                        targetElement = element;
                        break;
                    }
                }
                
                if (targetElement && sizeMatch.length > 0) {
                    const newSize = parseInt(sizeMatch[0]);
                    const property = lowerLine.includes('width') ? 'width' : 'height';
                    const currentValue = property === 'width' ? targetElement.width : targetElement.height;
                    
                    suggestions.push({
                        type: 'size',
                        elementId: targetElement.id,
                        property: property,
                        currentValue: currentValue,
                        suggestedValue: newSize,
                        confidence: 0.85,
                        reasoning: line.trim()
                    });
                }
            }
            
            // Extract text content suggestions
            const textMatch = line.match(/"([^"]+)"/);
            if (textMatch && (lowerLine.includes('text') || lowerLine.includes('title') || lowerLine.includes('content'))) {
                const textElements = elements.filter(el => el.type === 'TEXT');
                let targetElement = null;
                
                for (const textEl of textElements) {
                    if (lowerLine.includes(textEl.name.toLowerCase())) {
                        targetElement = textEl;
                        break;
                    }
                }
                
                if (!targetElement && textElements.length > 0) {
                    targetElement = textElements[0];
                }
                
                if (targetElement) {
                    suggestions.push({
                        type: 'text',
                        elementId: targetElement.id,
                        property: 'content',
                        currentValue: targetElement.characters || targetElement.name,
                        suggestedValue: textMatch[1],
                        confidence: 0.8,
                        reasoning: line.trim()
                    });
                }
            }
        }
        
        // If no specific suggestions found, create a summary suggestion
        if (suggestions.length === 0 && elements.length > 0) {
            // Try to extract key recommendations from the message
            const keyRecommendations = message.split('\n')
                .filter(line => line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.'))
                .slice(0, 3)
                .join(' ');
            
            suggestions.push({
                type: 'general',
                elementId: elements[0].id,
                property: 'analysis',
                currentValue: 'Current design',
                suggestedValue: 'See AI recommendations',
                confidence: 0.7,
                reasoning: keyRecommendations || message.substring(0, 200) + '...'
            });
        }
        
        return { 
            suggestions,
            originalMessage: message 
        };
        
    } catch (parseError) {
        console.error('Error parsing Foundry agent response:', parseError);
        return generateMockAIResponse(elements);
    }
}