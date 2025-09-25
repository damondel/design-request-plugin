module.exports = async function (context, req) {
    context.log('Health check triggered');
    
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: { 
            status: 'healthy',
            message: 'CXS AI Chat Request API is running',
            timestamp: new Date().toISOString()
        }
    };
};