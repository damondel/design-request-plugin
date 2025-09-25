const { callAzureOpenAI, generateMockAIResponse, parseColorValueForFigma, parseNumericValueFromAI } = require('../server-utils');

module.exports = async function (context, req) {
    context.log('API function triggered.');
    
    try {
        // Set CORS headers for Figma plugin (handles 'null' origin)
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, X-Requested-With",
            "Access-Control-Max-Age": "86400",
            "Vary": "Origin"
        };
        
        context.res = {
            headers: corsHeaders
        };

        // Handle OPTIONS request for CORS preflight
        if (req.method === 'OPTIONS') {
            context.res.status = 200;
            context.done();
            return;
        }

        // Get request body
        const { elements: directElements, type, data } = req.body;
        const elements = directElements || data?.elements || [];
        const requestType = type || 'design-analysis';
        
        context.log(`Processing ${elements.length} elements for type: ${requestType}`);
        
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

        // Configuration
        const USE_REAL_AI = process.env.USE_REAL_AI === 'true';
        const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
        const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
        const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
        
        let REAL_AI_AVAILABLE = USE_REAL_AI && AZURE_OPENAI_ENDPOINT && AZURE_OPENAI_API_KEY && AZURE_OPENAI_DEPLOYMENT;
        
        let aiResponse;
        
        // Try real AI first if available and configured
        if (REAL_AI_AVAILABLE) {
            try {
                context.log('Attempting Azure OpenAI request...');
                const rawResponse = await callAzureOpenAI(elements, 
                    AZURE_OPENAI_ENDPOINT, 
                    AZURE_OPENAI_API_KEY, 
                    AZURE_OPENAI_DEPLOYMENT);
                
                // Clean and parse the response
                let cleanedResponse = rawResponse.trim();
                if (cleanedResponse.startsWith('```json')) {
                    cleanedResponse = cleanedResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
                }
                
                aiResponse = JSON.parse(cleanedResponse);
                context.log('Azure OpenAI response parsed successfully');
                
            } catch (aiError) {
                context.log(`Azure OpenAI failed, using mock fallback: ${aiError.message}`);
                aiResponse = generateMockAIResponse(elements);
            }
        } else {
            context.log('Using mock AI response (real AI not configured)');
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
            suggestions: enhancedSuggestions
        };
        
    } catch (error) {
        context.log.error(`Analysis error: ${error.message}`);
        
        // Always provide a fallback response
        context.res.status = 200;
        context.res.body = {
            success: true,
            suggestions: generateMockAIResponse([]).suggestions || [],
            message: 'Using fallback analysis due to error'
        };
    }
};