const { callAzureOpenAI, generateMockAIResponse } = require('../server-utils');

module.exports = async function (context, req) {
    context.log('Figma Proxy function triggered');
    
    // Simple CORS headers - exactly like our working test
    const corsHeaders = {
        "Access-Control-Allow-Origin": "https://www.figma.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
        "Access-Control-Max-Age": "86400"
    };
    
    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: {}
        };
        return;
    }
    
    try {
        // Simple request processing
        const { elements } = req.body;
        
        if (!elements || !Array.isArray(elements)) {
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: { error: 'elements array required' }
            };
            return;
        }
        
        // Generate mock response (simpler for now)
        const mockResponse = generateMockAIResponse(elements);
        
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: {
                success: true,
                suggestions: mockResponse.suggestions,
                timestamp: new Date().toISOString()
            }
        };
        
    } catch (error) {
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: { 
                success: false, 
                error: error.message 
            }
        };
    }
};