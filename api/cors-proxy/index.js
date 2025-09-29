module.exports = async function (context, req) {
    // Ultimate CORS bypass - handle all preflight requests immediately
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "86400"
            },
            body: null
        };
        return;
    }

    // For actual requests, proxy to the real endpoints with CORS headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", 
        "Access-Control-Allow-Headers": "*"
    };

    try {
        // Extract target from query parameter
        const target = req.query.target || 'analyze-anonymous';
        
        let targetFunction;
        if (target === 'azure-foundry') {
            targetFunction = require('../analyze-foundry');
        } else {
            targetFunction = require('../analyze-anonymous');
        }

        // Create a new context for the target function
        const targetContext = {
            log: context.log,
            res: {}
        };

        // Call the target function
        await targetFunction(targetContext, req);

        // Return the result with CORS headers
        context.res = {
            status: targetContext.res.status || 200,
            headers: {
                ...corsHeaders,
                ...targetContext.res.headers
            },
            body: targetContext.res.body
        };

    } catch (error) {
        context.log.error('CORS Proxy Error:', error);
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: {
                error: 'Proxy error',
                message: error.message
            }
        };
    }
};