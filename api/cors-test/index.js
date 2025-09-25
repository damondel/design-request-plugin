module.exports = async function (context, req) {
    context.log('CORS Test function triggered');
    
    // Get origin from request
    const origin = req.headers.origin || 'unknown';
    context.log('Request origin:', origin);
    
    // Set CORS headers explicitly
    const corsHeaders = {
        "Access-Control-Allow-Origin": "https://www.figma.com",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
        "Access-Control-Max-Age": "86400"
    };
    
    context.res = {
        status: 200,
        headers: corsHeaders,
        body: {
            message: "CORS test successful",
            origin: origin,
            timestamp: new Date().toISOString(),
            headers: corsHeaders
        }
    };
};