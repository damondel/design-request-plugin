// Main plugin code that runs in Figma's context
// This handles communication with the UI and Figma API operations

// Types for AI API communication
interface AIRequest {
  type: 'design-analysis' | 'color-suggestion' | 'layout-optimization';
  data: {
    elements: ElementData[];
    context?: string;
  };
}

interface ElementData {
  id: string;
  type: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  characters?: string;
}

interface AIResponse {
  success: boolean;
  suggestions: {
    type: 'color' | 'position' | 'size' | 'text' | 'effect';
    elementId: string;
    property: string;
    currentValue: any;
    suggestedValue: any;
    confidence: number;
    reasoning: string;
  }[];
  error?: string;
}

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
    
    case 'apply-suggestion':
      await handleApplySuggestion(msg.suggestion);
      break;
    
    case 'close-plugin':
      figma.closePlugin();
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
  const allNodes: SceneNode[] = [];
  
  for (const node of selection) {
    // Always include the selected node itself
    allNodes.push(node);
    
    // If it's a frame or group, also include its direct children
    if ('children' in node && node.children) {
      for (const child of node.children) {
        // Only include visible, non-locked children
        if (child.visible !== false && !child.locked) {
          allNodes.push(child as SceneNode);
        }
      }
    }
  }

  // Extract data from all collected elements
  const elementData: ElementData[] = allNodes.map(node => extractElementData(node));
  
  // Send loading state to UI
  figma.ui.postMessage({
    type: 'analysis-started',
    elementCount: allNodes.length
  });

  // Prepare AI request
  const aiRequest: AIRequest = {
    type: 'design-analysis',
    data: {
      elements: elementData,
      context: `Analyzing ${allNodes.length} elements (${selection.length} selected + children) from ${figma.editorType === 'figma' ? 'Figma design' : 'FigJam'}`
    }
  };

  // Send to UI for API call (UI handles external network requests)
  figma.ui.postMessage({
    type: 'make-ai-request',
    request: aiRequest
  });
}

// Extract relevant data from Figma nodes
function extractElementData(node: SceneNode): ElementData {
  const baseData: ElementData = {
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
async function handleApplySuggestion(suggestion: any) {
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

    const sceneNode = node as SceneNode;

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

  } catch (error) {
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
async function applyColorSuggestion(node: SceneNode, suggestion: any) {
  console.log('🎨 Applying color suggestion:', suggestion);
  console.log('🎨 Current node fills:', 'fills' in node ? (node as any).fills : 'No fills property');
  
  // Handle SHAPE_WITH_TEXT and other composite elements
  if (node.type === 'SHAPE_WITH_TEXT' || (node.type as string).includes('SHAPE_WITH_TEXT')) {
    console.log('🎨 SHAPE_WITH_TEXT detected - applying color to shape component');
    // For SHAPE_WITH_TEXT, the fill is typically on the shape itself
    if ('fills' in node && suggestion.property === 'fill') {
      const colorValue = suggestion.suggestedValue;
      if (typeof colorValue === 'object' && colorValue.r !== undefined) {
        const newFill = { type: 'SOLID' as const, color: colorValue };
        (node as any).fills = [newFill];
        console.log('✅ Applied color to SHAPE_WITH_TEXT');
        return;
      }
    }
  }
  
  if ('fills' in node && suggestion.property === 'fill') {
    // Get current color for comparison
    const currentFills = (node as any).fills;
    if (currentFills && currentFills.length > 0) {
      const currentColor = currentFills[0].color;
      console.log(`🎨 Current color: RGB(${Math.round(currentColor.r * 255)}, ${Math.round(currentColor.g * 255)}, ${Math.round(currentColor.b * 255)})`);
    }
    
    // Validate the suggested color object
    const colorValue = suggestion.suggestedValue;
    console.log('🎨 Suggested color value:', colorValue);
    
    if (typeof colorValue === 'object' && colorValue.r !== undefined && colorValue.g !== undefined && colorValue.b !== undefined) {
      const newFill = {
        type: 'SOLID' as const,
        color: colorValue
      };
      (node as any).fills = [newFill];
      console.log(`✅ Applied color: RGB(${Math.round(colorValue.r * 255)}, ${Math.round(colorValue.g * 255)}, ${Math.round(colorValue.b * 255)})`);
    } else {
      console.log('❌ Invalid color value:', colorValue);
    }
  } else if ('fills' in node) {
    console.log('❌ Property not supported for this element:', suggestion.property);
  } else {
    console.log('⚠️  Node does not support fills - attempting to find child elements with fill capability');
    // Try to find fillable children for composite elements
    if ('children' in node) {
      const fillableChildren = (node as any).children.filter((child: any) => 'fills' in child);
      if (fillableChildren.length > 0) {
        console.log(`🎨 Found ${fillableChildren.length} fillable child elements`);
        const colorValue = suggestion.suggestedValue;
        if (typeof colorValue === 'object' && colorValue.r !== undefined) {
          const newFill = { type: 'SOLID' as const, color: colorValue };
          fillableChildren[0].fills = [newFill]; // Apply to first fillable child
          console.log('✅ Applied color to child element');
        }
      } else {
        console.log('❌ No fillable children found');
      }
    }
  }
}

// Apply position suggestions
async function applyPositionSuggestion(node: SceneNode, suggestion: any) {
  if ('x' in node && 'y' in node) {
    if (suggestion.property === 'x') {
      node.x = suggestion.suggestedValue;
    } else if (suggestion.property === 'y') {
      node.y = suggestion.suggestedValue;
    }
  }
}

// Apply size suggestions
async function applySizeSuggestion(node: SceneNode, suggestion: any) {
  console.log('📐 Applying size suggestion:', suggestion);
  console.log('📐 Node type:', node.type);
  console.log('📐 Current dimensions:', 'width' in node ? `${(node as any).width} x ${(node as any).height}` : 'No dimensions');
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
    const resizableNode = node as any;
    try {
      console.log('📐 About to resize...');
      if (suggestion.property === 'width') {
        console.log(`📐 Resizing width from ${resizableNode.width} to ${size}, keeping height ${resizableNode.height}`);
        resizableNode.resize(size, resizableNode.height);
        console.log('✅ Width resized successfully');
      } else if (suggestion.property === 'height') {
        console.log(`📐 Resizing height from ${resizableNode.height} to ${size}, keeping width ${resizableNode.width}`);
        resizableNode.resize(resizableNode.width, size);
        console.log('✅ Height resized successfully');
      } else {
        console.log('❌ Unknown size property:', suggestion.property);
      }
    } catch (error: any) {
      console.log('❌ Resize failed:', error.message);
    }
  } else {
    console.log('❌ Node does not support resizing - missing properties:', {
      hasWidth: 'width' in node,
      hasHeight: 'height' in node,
      hasResize: 'resize' in node
    });
  }
}

// Apply text suggestions
async function applyTextSuggestion(node: SceneNode, suggestion: any) {
  console.log('📝 Applying text suggestion:', suggestion.property, suggestion.suggestedValue);
  console.log('📝 Current node:', node.name, 'type:', node.type);
  
  if (node.type === 'TEXT') {
    try {
      // Load the font before making changes
      await figma.loadFontAsync(node.fontName as FontName);
      
      if (suggestion.property === 'content' || suggestion.property === 'characters' || suggestion.property === 'text') {
        // Clean the suggested value - remove quotes if present
        let newText = String(suggestion.suggestedValue);
        if (newText.startsWith('"') && newText.endsWith('"')) {
          newText = newText.slice(1, -1);
        }
        
        console.log('📝 About to change text from:', (node as any).characters, 'to:', newText);
        node.characters = newText;
        console.log('✅ Text changed successfully to:', newText);
        console.log('📝 Verifying text is now:', (node as any).characters);
      }
    } catch (error: any) {
      console.log('❌ Text change failed:', error.message);
    }
  } else if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'GROUP' || (node.type as string).includes('SHAPE_WITH_TEXT')) {
    // Handle SHAPE_WITH_TEXT or composite elements - find text children
    console.log('📝 Composite element detected, searching for text children...');
    const textNodes: any[] = [];
    
    function findTextNodes(searchNode: any) {
      if (searchNode.type === 'TEXT') {
        textNodes.push(searchNode);
      } else if ('children' in searchNode) {
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
          await figma.loadFontAsync(textNode.fontName as FontName);
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
        } catch (error: any) {
          console.log('❌ Text suggestion failed for child text node:', error.message);
        }
      }
    } else {
      console.log('❌ No text nodes found in composite element');
    }
  } else {
    console.log('❌ Node is not a text element or composite element:', node.type);
  }
}

// Apply general suggestions (alignment, etc.)
async function applyGeneralSuggestion(node: SceneNode, suggestion: any) {
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
        console.log('⚙️ Current textAlignHorizontal:', 'textAlignHorizontal' in node ? (node as any).textAlignHorizontal : 'N/A');
        
        if ('textAlignHorizontal' in node) {
          if (alignment.includes('center')) {
            (node as any).textAlignHorizontal = 'CENTER';
            console.log('✅ Set text horizontal alignment to CENTER');
          } else if (alignment.includes('left')) {
            (node as any).textAlignHorizontal = 'LEFT';
            console.log('✅ Set text horizontal alignment to LEFT');
          } else if (alignment.includes('right')) {
            (node as any).textAlignHorizontal = 'RIGHT';
            console.log('✅ Set text horizontal alignment to RIGHT');
          }
        }
        
        if ('textAlignVertical' in node && alignment.includes('vertical')) {
          if (alignment.includes('center')) {
            (node as any).textAlignVertical = 'CENTER';
            console.log('✅ Set text vertical alignment to CENTER');
          } else if (alignment.includes('top')) {
            (node as any).textAlignVertical = 'TOP';
            console.log('✅ Set text vertical alignment to TOP');
          } else if (alignment.includes('bottom')) {
            (node as any).textAlignVertical = 'BOTTOM';
            console.log('✅ Set text vertical alignment to BOTTOM');
          }
        }
      }
      // Handle composite elements (SHAPE_WITH_TEXT, etc.) - find text children
      else if (node.type === 'COMPONENT' || node.type === 'INSTANCE' || node.type === 'FRAME' || node.type === 'GROUP' || (node.type as string).includes('SHAPE_WITH_TEXT')) {
        console.log('⚙️ Composite element - searching for text children to align...');
        const textNodes: any[] = [];
        
        function findTextNodes(searchNode: any) {
          if (searchNode.type === 'TEXT') {
            textNodes.push(searchNode);
          } else if ('children' in searchNode) {
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
              await figma.loadFontAsync(textNode.fontName as FontName);
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
            } catch (fontError: any) {
              console.log('❌ Font loading failed for alignment:', fontError.message);
            }
          }
        } else {
          console.log('⚙️ No text nodes found in composite element for alignment');
        }
      }
      // Handle layout alignment for frames with auto layout
      else if ('layoutAlign' in node) {
        console.log('⚙️ Node has layoutAlign property');
        if (alignment.includes('center')) {
          (node as any).layoutAlign = 'CENTER';
          console.log('✅ Set layout alignment to CENTER');
        } else if (alignment.includes('left') || alignment.includes('start')) {
          (node as any).layoutAlign = 'MIN';
          console.log('✅ Set layout alignment to MIN');
        } else if (alignment.includes('right') || alignment.includes('end')) {
          (node as any).layoutAlign = 'MAX';
          console.log('✅ Set layout alignment to MAX');
        }
      } else {
        console.log('⚙️ Alignment not applicable to this element type - no supported alignment properties');
      }
    } catch (error: any) {
      console.log('❌ General suggestion failed:', error.message);
    }
  } else {
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

// Handle selection changes
figma.on('selectionchange', () => {
  updateSelectionData();
});



// Initialize plugin
console.log('CXS AI Chat Request plugin loaded');

// Send initial selection data to UI
updateSelectionData();
