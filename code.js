"use strict";
// Main plugin code that runs in Figma's context
// This handles communication with the UI and Figma API operations
// Show the plugin UI
figma.showUI(__html__, {
    width: 400,
    height: 600,
    themeColors: true
});
// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
    console.log('Received message:', msg);
    switch (msg.type) {
        case 'analyze-selection':
            await handleAnalyzeSelection();
            break;
        case 'make-ai-request':
            await handleAIRequest(msg.request, msg.provider, msg.config);
            break;
        case 'apply-suggestion':
            await handleApplySuggestion(msg.suggestion);
            break;
        case 'close-plugin':
            figma.closePlugin();
            break;
        case 'get-selection-data':
            sendSelectionData();
            break;
        default:
            console.log('Unknown message type:', msg.type);
    }
};
// Analyze selected elements and send to AI
async function handleAnalyzeSelection() {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
        figma.ui.postMessage({
            type: 'error',
            message: 'Please select at least one element to analyze.'
        });
        return;
    }
    // Collect all analyzable nodes (including children of frames)
    const allNodes = [];
    for (const node of selection) {
        // Always include the selected node itself
        allNodes.push(node);
        // If it's a frame or group, also include its direct children
        if ('children' in node && node.children) {
            for (const child of node.children) {
                // Only include visible, non-locked children
                if (child.visible !== false && !child.locked) {
                    allNodes.push(child);
                }
            }
        }
    }
    // Extract data from all collected elements
    const elementData = allNodes.map(node => extractElementData(node));
    // Send loading state to UI
    figma.ui.postMessage({
        type: 'analysis-started',
        elementCount: allNodes.length
    });
    // Prepare AI request
    const aiRequest = {
        type: 'design-analysis',
        data: {
            elements: elementData,
            context: `Analyzing ${allNodes.length} elements (${selection.length} selected + children) from ${figma.editorType === 'figma' ? 'Figma design' : 'FigJam'}`
        }
    };
    // Send to UI to get configuration, then make AI request directly
    figma.ui.postMessage({
        type: 'get-ai-config',
        request: aiRequest
    });
}
// Extract relevant data from Figma nodes
function extractElementData(node) {
    const baseData = {
        id: node.id,
        type: node.type,
        name: node.name,
        width: 'width' in node ? node.width : 0,
        height: 'height' in node ? node.height : 0,
        x: 'x' in node ? node.x : 0,
        y: 'y' in node ? node.y : 0
    };
    // Add fills if available
    if ('fills' in node && node.fills) {
        baseData.fills = Array.isArray(node.fills) ? node.fills : [];
    }
    // Add strokes if available
    if ('strokes' in node && node.strokes) {
        baseData.strokes = Array.isArray(node.strokes) ? node.strokes : [];
    }
    // Add effects if available
    if ('effects' in node && node.effects) {
        baseData.effects = [...node.effects];
    }
    // Add text content if it's a text node
    if (node.type === 'TEXT' && 'characters' in node) {
        baseData.characters = node.characters;
    }
    return baseData;
}
// Apply AI suggestion to Figma element
async function handleApplySuggestion(suggestion) {
    console.log('🎯 APPLYING SUGGESTION:', suggestion);
    console.log('🎯 Targeting element ID:', suggestion.elementId);
    console.log('🎯 Suggestion type:', suggestion.type);
    console.log('🎯 Property:', suggestion.property);
    console.log('🎯 Current value:', suggestion.currentValue);
    console.log('🎯 Suggested value:', suggestion.suggestedValue);
    try {
        const node = figma.getNodeById(suggestion.elementId);
        if (!node) {
            console.log('❌ Node not found with ID:', suggestion.elementId);
            figma.ui.postMessage({
                type: 'error',
                message: `Element with ID ${suggestion.elementId} not found.`
            });
            return;
        }
        console.log('✅ Found node:', node.name, 'type:', node.type);
        // Check if node is a SceneNode (not PageNode or DocumentNode)
        if (!('type' in node) || node.type === 'PAGE' || node.type === 'DOCUMENT') {
            figma.ui.postMessage({
                type: 'error',
                message: 'Cannot modify this type of element.'
            });
            return;
        }
        const sceneNode = node;
        // Apply different types of suggestions
        switch (suggestion.type) {
            case 'color':
                await applyColorSuggestion(sceneNode, suggestion);
                break;
            case 'position':
                await applyPositionSuggestion(sceneNode, suggestion);
                break;
            case 'size':
                await applySizeSuggestion(sceneNode, suggestion);
                break;
            case 'text':
                await applyTextSuggestion(sceneNode, suggestion);
                break;
            case 'alignment':
                await applyGeneralSuggestion(sceneNode, suggestion);
                break;
            case 'general':
                await applyGeneralSuggestion(sceneNode, suggestion);
                break;
            default:
                console.log('❌ Unknown suggestion type:', suggestion.type, '- Attempting general handler');
                await applyGeneralSuggestion(sceneNode, suggestion);
        }
        figma.ui.postMessage({
            type: 'suggestion-applied',
            suggestion: suggestion
        });
    }
    catch (error) {
        console.log('❌ SUGGESTION APPLICATION FAILED:', {
            suggestionType: suggestion.type,
            elementId: suggestion.elementId,
            property: suggestion.property,
            error: error
        });
        figma.ui.postMessage({
            type: 'error',
            message: `Failed to apply ${suggestion.type} suggestion: ${error}`
        });
    }
}
// Apply color suggestions
async function applyColorSuggestion(node, suggestion) {
    console.log('🎨 Applying color suggestion:', suggestion);
    console.log('🎨 Current node fills:', 'fills' in node ? node.fills : 'No fills property');
    // Handle SHAPE_WITH_TEXT and other composite elements
    if (node.type === 'SHAPE_WITH_TEXT' || node.type.includes('SHAPE_WITH_TEXT')) {
        console.log('🎨 SHAPE_WITH_TEXT detected - applying color to shape component');
        // For SHAPE_WITH_TEXT, the fill is typically on the shape itself
        if ('fills' in node && suggestion.property === 'fill') {
            const colorValue = suggestion.suggestedValue;
            if (typeof colorValue === 'object' && colorValue.r !== undefined) {
                const newFill = { type: 'SOLID', color: colorValue };
                node.fills = [newFill];
                console.log('✅ Applied color to SHAPE_WITH_TEXT');
                return;
            }
        }
    }
    if ('fills' in node && suggestion.property === 'fill') {
        // Get current color for comparison
        const currentFills = node.fills;
        if (currentFills && currentFills.length > 0) {
            const currentColor = currentFills[0].color;
            console.log(`🎨 Current color: RGB(${Math.round(currentColor.r * 255)}, ${Math.round(currentColor.g * 255)}, ${Math.round(currentColor.b * 255)})`);
        }
        // Validate the suggested color object
        const colorValue = suggestion.suggestedValue;
        console.log('🎨 Suggested color value:', colorValue);
        if (typeof colorValue === 'object' && colorValue.r !== undefined && colorValue.g !== undefined && colorValue.b !== undefined) {
            const newFill = {
                type: 'SOLID',
                color: colorValue
            };
            node.fills = [newFill];
            console.log(`✅ Applied color: RGB(${Math.round(colorValue.r * 255)}, ${Math.round(colorValue.g * 255)}, ${Math.round(colorValue.b * 255)})`);
        }
        else {
            console.log('❌ Invalid color value:', colorValue);
        }
    }
    else if ('fills' in node) {
        console.log('❌ Property not supported for this element:', suggestion.property);
    }
    else {
        console.log('⚠️  Node does not support fills - attempting to find child elements with fill capability');
        // Try to find fillable children for composite elements
        if ('children' in node) {
            const fillableChildren = node.children.filter((child) => 'fills' in child);
            if (fillableChildren.length > 0) {
                console.log(`🎨 Found ${fillableChildren.length} fillable child elements`);
                const colorValue = suggestion.suggestedValue;
                if (typeof colorValue === 'object' && colorValue.r !== undefined) {
                    const newFill = { type: 'SOLID', color: colorValue };
                    fillableChildren[0].fills = [newFill]; // Apply to first fillable child
                    console.log('✅ Applied color to child element');
                }
            }
            else {
                console.log('❌ No fillable children found');
            }
        }
    }
}
// Apply position suggestions
async function applyPositionSuggestion(node, suggestion) {
    if ('x' in node && 'y' in node) {
        if (suggestion.property === 'x') {
            node.x = suggestion.suggestedValue;
        }
        else if (suggestion.property === 'y') {
            node.y = suggestion.suggestedValue;
        }
    }
}
// Apply size suggestions
async function applySizeSuggestion(node, suggestion) {
    console.log('📐 Applying size suggestion:', suggestion);
    console.log('📐 Node type:', node.type);
    console.log('📐 Current dimensions:', 'width' in node ? `${node.width} x ${node.height}` : 'No dimensions');
    console.log('📐 Has resize method:', 'resize' in node);
    // Parse the suggested value to ensure it's a number
    const size = typeof suggestion.suggestedValue === 'number' ?
        suggestion.suggestedValue : parseFloat(suggestion.suggestedValue);
    console.log('📐 Parsed size value:', size);
    if (isNaN(size) || size <= 0) {
        console.log('❌ Invalid size value:', suggestion.suggestedValue, 'parsed to:', size);
        return;
    }
    if ('width' in node && 'height' in node && 'resize' in node) {
        const resizableNode = node;
        try {
            console.log('📐 About to resize...');
            if (suggestion.property === 'width') {
                console.log(`📐 Resizing width from ${resizableNode.width} to ${size}, keeping height ${resizableNode.height}`);
                resizableNode.resize(size, resizableNode.height);
                console.log('✅ Width resized successfully');
            }
            else if (suggestion.property === 'height') {
                console.log(`📐 Resizing height from ${resizableNode.height} to ${size}, keeping width ${resizableNode.width}`);
                resizableNode.resize(resizableNode.width, size);
                console.log('✅ Height resized successfully');
            }
            else {
                console.log('❌ Unknown size property:', suggestion.property);
            }
        }
        catch (error) {
            console.log('❌ Resize failed:', error.message);
        }
    }
    else {
        console.log('❌ Node does not support resizing - missing properties:', {
            hasWidth: 'width' in node,
            hasHeight: 'height' in node,
            hasResize: 'resize' in node
        });
    }
}
// Apply text suggestions
async function applyTextSuggestion(node, suggestion) {
    console.log('📝 Applying text suggestion:', suggestion.property, suggestion.suggestedValue);
    console.log('📝 Current node:', node.name, 'type:', node.type);
    if (node.type === 'TEXT') {
        try {
            // Load the font before making changes
            await figma.loadFontAsync(node.fontName);
            if (suggestion.property === 'content' || suggestion.property === 'characters' || suggestion.property === 'text') {
                // Clean the suggested value - remove quotes if present
                let newText = String(suggestion.suggestedValue);
                if (newText.startsWith('"') && newText.endsWith('"')) {
                    newText = newText.slice(1, -1);
                }
                console.log('📝 About to change text from:', node.characters, 'to:', newText);
                node.characters = newText;
                console.log('✅ Text changed successfully to:', newText);
                console.log('📝 Verifying text is now:', node.characters);
            }
        }
        catch (error) {
            console.log('❌ Text change failed:', error.message);
        }
    }
    else if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'GROUP' || node.type.includes('SHAPE_WITH_TEXT')) {
        // Handle SHAPE_WITH_TEXT or composite elements - find text children
        console.log('📝 Composite element detected, searching for text children...');
        const textNodes = [];
        function findTextNodes(searchNode) {
            if (searchNode.type === 'TEXT') {
                textNodes.push(searchNode);
            }
            else if ('children' in searchNode) {
                for (const child of searchNode.children) {
                    findTextNodes(child);
                }
            }
        }
        findTextNodes(node);
        if (textNodes.length > 0) {
            console.log(`📝 Found ${textNodes.length} text node(s) in composite element`);
            for (const textNode of textNodes) {
                try {
                    await figma.loadFontAsync(textNode.fontName);
                    if (suggestion.property === 'content' || suggestion.property === 'characters' || suggestion.property === 'text') {
                        let newText = String(suggestion.suggestedValue);
                        if (newText.startsWith('"') && newText.endsWith('"')) {
                            newText = newText.slice(1, -1);
                        }
                        console.log('📝 About to change composite text from:', textNode.characters, 'to:', newText);
                        textNode.characters = newText;
                        console.log('✅ Composite text updated to:', newText);
                        console.log('📝 Verifying composite text is now:', textNode.characters);
                    }
                }
                catch (error) {
                    console.log('❌ Text suggestion failed for child text node:', error.message);
                }
            }
        }
        else {
            console.log('❌ No text nodes found in composite element');
        }
    }
    else {
        console.log('❌ Node is not a text element or composite element:', node.type);
    }
}
// Apply general suggestions (alignment, etc.)
async function applyGeneralSuggestion(node, suggestion) {
    console.log('⚙️ Applying general suggestion:', suggestion);
    console.log('⚙️ Node type:', node.type);
    console.log('⚙️ Node properties available:', Object.keys(node));
    if (suggestion.property === 'alignment' || suggestion.property.includes('align') || String(suggestion.suggestedValue).toLowerCase().includes('align') || String(suggestion.suggestedValue).toLowerCase().includes('center')) {
        try {
            const alignment = String(suggestion.suggestedValue).toLowerCase();
            console.log('⚙️ Processing alignment suggestion:', alignment);
            console.log('⚙️ Suggestion property:', suggestion.property);
            // Handle text alignment
            if (node.type === 'TEXT') {
                console.log('⚙️ TEXT node - checking text alignment properties');
                console.log('⚙️ Has textAlignHorizontal:', 'textAlignHorizontal' in node);
                console.log('⚙️ Has textAlignVertical:', 'textAlignVertical' in node);
                console.log('⚙️ Current textAlignHorizontal:', 'textAlignHorizontal' in node ? node.textAlignHorizontal : 'N/A');
                if ('textAlignHorizontal' in node) {
                    if (alignment.includes('center')) {
                        node.textAlignHorizontal = 'CENTER';
                        console.log('✅ Set text horizontal alignment to CENTER');
                    }
                    else if (alignment.includes('left')) {
                        node.textAlignHorizontal = 'LEFT';
                        console.log('✅ Set text horizontal alignment to LEFT');
                    }
                    else if (alignment.includes('right')) {
                        node.textAlignHorizontal = 'RIGHT';
                        console.log('✅ Set text horizontal alignment to RIGHT');
                    }
                }
                if ('textAlignVertical' in node && alignment.includes('vertical')) {
                    if (alignment.includes('center')) {
                        node.textAlignVertical = 'CENTER';
                        console.log('✅ Set text vertical alignment to CENTER');
                    }
                    else if (alignment.includes('top')) {
                        node.textAlignVertical = 'TOP';
                        console.log('✅ Set text vertical alignment to TOP');
                    }
                    else if (alignment.includes('bottom')) {
                        node.textAlignVertical = 'BOTTOM';
                        console.log('✅ Set text vertical alignment to BOTTOM');
                    }
                }
            }
            // Handle composite elements (SHAPE_WITH_TEXT, etc.) - find text children
            else if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'GROUP' || node.type.includes('SHAPE_WITH_TEXT')) {
                console.log('⚙️ Composite element - searching for text children to align...');
                const textNodes = [];
                function findTextNodes(searchNode) {
                    if (searchNode.type === 'TEXT') {
                        textNodes.push(searchNode);
                    }
                    else if ('children' in searchNode) {
                        for (const child of searchNode.children) {
                            findTextNodes(child);
                        }
                    }
                }
                findTextNodes(node);
                if (textNodes.length > 0) {
                    console.log(`⚙️ Found ${textNodes.length} text node(s) to align in composite element`);
                    for (const textNode of textNodes) {
                        try {
                            // Load font before changing alignment
                            await figma.loadFontAsync(textNode.fontName);
                            if ('textAlignHorizontal' in textNode) {
                                if (alignment.includes('center')) {
                                    textNode.textAlignHorizontal = 'CENTER';
                                    console.log('✅ Set text horizontal alignment to CENTER in composite');
                                }
                                else if (alignment.includes('left')) {
                                    textNode.textAlignHorizontal = 'LEFT';
                                    console.log('✅ Set text horizontal alignment to LEFT in composite');
                                }
                                else if (alignment.includes('right')) {
                                    textNode.textAlignHorizontal = 'RIGHT';
                                    console.log('✅ Set text horizontal alignment to RIGHT in composite');
                                }
                            }
                        }
                        catch (fontError) {
                            console.log('❌ Font loading failed for alignment:', fontError.message);
                        }
                    }
                }
                else {
                    console.log('⚙️ No text nodes found in composite element for alignment');
                }
            }
            // Handle layout alignment for frames with auto layout
            else if ('layoutAlign' in node) {
                console.log('⚙️ Node has layoutAlign property');
                if (alignment.includes('center')) {
                    node.layoutAlign = 'CENTER';
                    console.log('✅ Set layout alignment to CENTER');
                }
                else if (alignment.includes('left') || alignment.includes('start')) {
                    node.layoutAlign = 'MIN';
                    console.log('✅ Set layout alignment to MIN');
                }
                else if (alignment.includes('right') || alignment.includes('end')) {
                    node.layoutAlign = 'MAX';
                    console.log('✅ Set layout alignment to MAX');
                }
            }
            else {
                console.log('⚙️ Alignment not applicable to this element type - no supported alignment properties');
            }
        }
        catch (error) {
            console.log('❌ General suggestion failed:', error.message);
        }
    }
    else {
        console.log('⚙️ General suggestion type not implemented:', suggestion.property);
    }
}
// Get current selection data for UI display
function updateSelectionData() {
    const selection = figma.currentPage.selection;
    const selectionData = selection.map(extractElementData);
    // Update the UI with current selection
    figma.ui.postMessage({
        type: 'selection-data',
        data: selectionData
    });
}

// Handle AI request using Figma's Fetch API (avoids CORS issues)
async function handleAIRequest(request, provider, config) {
    console.log('🚀 Making AI request directly from main thread:', provider);
    console.log('🔍 Request details:', request);
    console.log('⚙️ Config details:', config);
    
    try {
        // Test with a known CORS-friendly endpoint first
        console.log('🧪 Testing with CORS-friendly endpoint first...');
        const testResponse = await fetch('https://httpbin.org/get');
        console.log('🧪 Test fetch status:', testResponse.status);
        
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('✅ Test fetch successful - Figma fetch API is working');
        }
        
        // Now try our health endpoint
        const healthUrl = 'https://delightful-pebble-004e7300f.1.azurestaticapps.net/api/health';
        console.log('🏥 Testing health endpoint:', healthUrl);
        
        const healthResponse = await fetch(healthUrl);
        console.log('🏥 Health check status:', healthResponse.status);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ Health check successful:', healthData);
        } else {
            console.error('❌ Health check failed:', healthResponse.status, healthResponse.statusText);
            const healthError = await healthResponse.text();
            console.error('❌ Health error body:', healthError);
            throw new Error(`Health check failed: ${healthResponse.status} - ${healthError}`);
        }
        
        // Determine endpoint based on provider
        const baseUrl = config.apiEndpoint || 'https://delightful-pebble-004e7300f.1.azurestaticapps.net';
        let endpoint;
        if (provider === 'azure-foundry') {
            endpoint = `${baseUrl}/api/analyze-foundry`;
        } else {
            endpoint = `${baseUrl}/api/analyze-anonymous`;
        }
        
        console.log('🔍 DEBUGGING ENDPOINT CONSTRUCTION:');
        console.log('  Provider:', provider);
        console.log('  Config baseUrl:', config.apiEndpoint);
        console.log('  Final constructed endpoint:', endpoint);
        console.log('🌐 Making actual AI request...');
        console.log('🔍 Request details:', {
            endpoint,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            bodyPreview: JSON.stringify(request).substring(0, 200) + '...'
        });
        
        // Try a minimal test request first to isolate the issue
        console.log('🧪 First, trying a minimal test request...');
        try {
            const testResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ test: true, message: 'simple test' })
            });
            console.log('✅ Test request succeeded:', testResponse.status);
        } catch (testError) {
            console.error('❌ Test request failed:', testError);
            throw new Error(`Minimal test failed: ${testError.message}`);
        }
        
        // Now try the actual request
        console.log('🚀 Now trying actual request...');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });
        
        console.log('📥 Response received! Status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error body:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ AI request successful:', result);
        
        // Send result back to UI
        figma.ui.postMessage({
            type: 'ai-response',
            result: result,
            provider: provider
        });
        
    } catch (error) {
        console.error('❌ AI request failed in main thread:', error);
        console.error('❌ Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Send error back to UI
        figma.ui.postMessage({
            type: 'ai-error',
            error: error.message,
            provider: provider
        });
    }
}

// Send current selection data to UI
function sendSelectionData() {
    updateSelectionData();
}

// Handle selection changes
figma.on('selectionchange', () => {
    updateSelectionData();
});
// Initialize plugin
console.log('CXS AI Chat Request plugin loaded');
// Send initial selection data to UI
updateSelectionData();
