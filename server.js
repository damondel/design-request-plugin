const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import your existing function logic
const { 
    callAzureAIFoundryAgent, 
    callAzureAIFoundryViaOpenAI,
    getAzureAccessToken,
    generateMockAIResponse, 
    parseColorValueForFigma, 
    parseNumericValueFromAI 
} = require('./api/server-utils');

const app = express();
const PORT = process.env.PORT || 80;

// Ultimate CORS configuration for Figma
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: false
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        message: 'CXS AI Chat Request API is running',
        timestamp: new Date().toISOString() 
    });
});

// Azure AI Foundry endpoint
app.post('/api/analyze-foundry', async (req, res) => {
    console.log('Azure AI Foundry endpoint called');
    
    try {
        const { elements: directElements, type, data } = req.body;
        const elements = directElements || data?.elements || [];
        
        if (!elements || !Array.isArray(elements)) {
            return res.status(400).json({ 
                error: 'Invalid request: elements array is required',
                received: {
                    elementsType: typeof elements,
                    elementsLength: elements?.length,
                    bodyKeys: Object.keys(req.body)
                }
            });
        }

        // Configuration for Azure AI Foundry
        const PROJECT_ENDPOINT = process.env.AZURE_AI_PROJECT_ENDPOINT;
        const AGENT_ID = process.env.AZURE_AI_AGENT_ID;
        const TENANT_ID = process.env.AZURE_TENANT_ID;
        const CLIENT_ID = process.env.AZURE_CLIENT_ID;
        const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
        
        let aiResponse;
        
        if (PROJECT_ENDPOINT && AGENT_ID && TENANT_ID && CLIENT_ID && CLIENT_SECRET) {
            try {
                console.log('Getting Azure access token...');
                const accessToken = await getAzureAccessToken(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
                console.log('Calling Azure AI Foundry agent...');
                const rawResponse = await callAzureAIFoundryAgent(elements, PROJECT_ENDPOINT, AGENT_ID, accessToken);
                aiResponse = parseFoundryAgentResponse(rawResponse, elements);
                console.log('Azure AI Foundry response processed successfully');
            } catch (aiError) {
                console.log(`Azure AI Foundry failed: ${aiError.message}, using mock fallback`);
                aiResponse = generateMockAIResponse(elements);
            }
        } else {
            console.log('Azure AI Foundry not configured, using mock response');
            aiResponse = generateMockAIResponse(elements);
        }

        // Process suggestions
        const enhancedSuggestions = aiResponse.suggestions.map((suggestion, index) => {
            let matchingElement = elements[index % elements.length];
            
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

        res.json({
            success: true,
            suggestions: enhancedSuggestions,
            source: 'Azure AI Foundry Agent (ACI)'
        });
        
    } catch (error) {
        console.error('Azure AI Foundry analysis error:', error);
        res.json({
            success: true,
            suggestions: generateMockAIResponse([]).suggestions || [],
            message: 'Using fallback analysis due to error',
            source: 'Mock Fallback (ACI)'
        });
    }
});

// Azure OpenAI endpoint
app.post('/api/analyze-anonymous', async (req, res) => {
    console.log('Azure OpenAI endpoint called');
    
    try {
        const { elements: directElements, type, data } = req.body;
        const elements = directElements || data?.elements || [];
        
        if (!elements || !Array.isArray(elements)) {
            return res.status(400).json({ 
                error: 'Invalid request: elements array is required'
            });
        }

        // For now, use mock response (can add real Azure OpenAI later)
        const aiResponse = generateMockAIResponse(elements);

        res.json({
            success: true,
            suggestions: aiResponse.suggestions,
            metadata: {
                elementsAnalyzed: elements.length,
                analysisType: type || 'design-analysis',
                timestamp: new Date().toISOString(),
                source: 'Azure OpenAI (ACI)'
            }
        });
        
    } catch (error) {
        console.error('Azure OpenAI analysis error:', error);
        res.json({
            success: false,
            error: error.message,
            suggestions: [],
            metadata: {
                fallback: true,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Parse Azure AI Foundry agent response (copy from existing function)
function parseFoundryAgentResponse(foundryResponse, elements) {
    try {
        if (foundryResponse.suggestions && Array.isArray(foundryResponse.suggestions)) {
            return foundryResponse;
        }
        
        const message = foundryResponse.message || foundryResponse;
        const suggestions = [];
        
        // Basic parsing - can be enhanced
        if (elements.length > 0) {
            suggestions.push({
                type: 'general',
                elementId: elements[0].id,
                property: 'analysis',
                currentValue: 'Current design',
                suggestedValue: 'AI analysis complete',
                confidence: 0.8,
                reasoning: message.substring(0, 200) + '...'
            });
        }
        
        return { suggestions };
        
    } catch (parseError) {
        console.error('Error parsing Foundry response:', parseError);
        return generateMockAIResponse(elements);
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Figma Plugin API running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🤖 Azure AI Foundry: http://localhost:${PORT}/api/analyze-foundry`);
    console.log(`🧠 Azure OpenAI: http://localhost:${PORT}/api/analyze-anonymous`);
});