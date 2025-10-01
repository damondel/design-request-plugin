"use strict";
// UI code that runs in the iframe and handles AI API communication
// Global state
let currentSuggestions = [];
let config = {
    apiEndpoint: 'https://figma-plugin-api.politepebble-97923130.westus2.azurecontainerapps.io/api/analyze-anonymous',
    apiKey: '',
    analysisType: 'design-analysis'
};
// DOM elements
const selectionCount = document.getElementById('selectionCount');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const suggestionsContainer = document.getElementById('suggestionsContainer');
const suggestionsList = document.getElementById('suggestionsList');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const configSection = document.getElementById('configSection');
const apiEndpointInput = document.getElementById('apiEndpoint');
const apiKeyInput = document.getElementById('apiKey');
const analysisTypeSelect = document.getElementById('analysisType');
const debugBtn = document.getElementById('debugBtn');
const forceBtn = document.getElementById('forceBtn');
const debugOutput = document.getElementById('debugOutput');
const debugMessages = document.getElementById('debugMessages');
// Initialize UI
console.log('🚀 UI SCRIPT LOADING...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded, initializing UI...');
    console.log('🔍 Checking for buttons:', {
        analyzeBtn: !!analyzeBtn,
        debugBtn: !!debugBtn,
        forceBtn: !!forceBtn
    });
    loadConfig();
    setupEventListeners();
    // Test if buttons work with direct onclick
    if (forceBtn) {
        forceBtn.onclick = () => {
            console.log('🎯 DIRECT ONCLICK WORKED!');
            alert('Direct onclick worked!');
        };
    }
    // Request initial selection data
    parent.postMessage({
        pluginMessage: { type: 'get-selection-data' }
    }, '*');
});
// Also try immediate initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
}
else {
    console.log('⚡ Document already loaded, initializing immediately...');
    loadConfig();
    setupEventListeners();
    parent.postMessage({
        pluginMessage: { type: 'get-selection-data' }
    }, '*');
}
console.log('📋 UI SCRIPT LOADED COMPLETELY');
// Load configuration from localStorage
function loadConfig() {
    try {
        const savedConfig = localStorage.getItem('aiDesignAssistant_config');
        if (savedConfig) {
            const parsed = JSON.parse(savedConfig);
            config = Object.assign(Object.assign({}, config), parsed);
            // Update UI elements
            apiEndpointInput.value = config.apiEndpoint;
            apiKeyInput.value = config.apiKey || '';
            analysisTypeSelect.value = config.analysisType;
        }
    }
    catch (error) {
        console.error('Error loading config:', error);
    }
}
// Save configuration to localStorage
function saveConfig() {
    config.apiEndpoint = apiEndpointInput.value.trim();
    config.apiKey = apiKeyInput.value.trim();
    config.analysisType = analysisTypeSelect.value;
    try {
        localStorage.setItem('aiDesignAssistant_config', JSON.stringify(config));
        showSuccessMessage('Configuration saved successfully!');
    }
    catch (error) {
        showErrorMessage('Error saving configuration: ' + error);
    }
}
// Toggle configuration section
function toggleConfig() {
    configSection.classList.toggle('expanded');
}
// Setup event listeners
function setupEventListeners() {
    showDebugMessage('Setting up event listeners...');
    showDebugMessage(`Debug button element: ${debugBtn ? 'FOUND' : 'NOT FOUND'}`);
    if (!debugBtn) {
        showDebugMessage('ERROR: Debug button not found!');
        return;
    }
    analyzeBtn.addEventListener('click', () => {
        showDebugMessage('Analyze button clicked');
        parent.postMessage({
            pluginMessage: { type: 'analyze-selection' }
        }, '*');
    });
    // Debug button with extra logging
    debugBtn.addEventListener('click', (event) => {
        showDebugMessage('🎯 DEBUG BUTTON CLICKED!');
        showDebugMessage('Requesting selection data...');
        parent.postMessage({
            pluginMessage: { type: 'get-selection-data' }
        }, '*');
    });
    // FORCE button - bypass all events
    forceBtn.addEventListener('click', (event) => {
        showDebugMessage('🚨 FORCE BUTTON CLICKED!');
        parent.postMessage({
            pluginMessage: { type: 'force-selection-check' }
        }, '*');
    });
    showDebugMessage('✅ Debug button event listener added');
    // Save config on input changes
    apiEndpointInput.addEventListener('blur', saveConfig);
    apiKeyInput.addEventListener('blur', saveConfig);
    analysisTypeSelect.addEventListener('change', saveConfig);
}
// Handle messages from the main plugin
window.onmessage = async (event) => {
    const message = event.data.pluginMessage;
    console.log('UI received message:', message);
    switch (message.type) {
        case 'selection-data':
            updateSelectionInfo(message.data);
            break;
        case 'analysis-started':
            showLoading();
            break;
        case 'make-ai-request':
            // Note: This is handled by the main thread now, not the UI
            console.log('make-ai-request message received but handled by main thread');
            break;
        case 'suggestion-applied':
            handleSuggestionApplied(message.suggestion);
            break;
        case 'error':
            showErrorMessage(message.message);
            hideLoading();
            break;
        case 'debug-info':
            showDebugMessage(message.message);
            break;
        default:
            console.log('Unknown message type:', message.type);
    }
};
// Update selection information
function updateSelectionInfo(selectionData) {
    const count = selectionData.length;
    selectionCount.textContent = `${count} element${count !== 1 ? 's' : ''}`;
    analyzeBtn.disabled = count === 0;
}
// Show loading state
function showLoading() {
    loadingIndicator.classList.add('show');
    analyzeBtn.disabled = true;
    hideMessages();
}
// Hide loading state
function hideLoading() {
    loadingIndicator.classList.remove('show');
    analyzeBtn.disabled = false;
}
// Note: handleAIRequest has been moved to the main thread (code.ts) to avoid CORS issues
// The UI now uses the new architecture where main thread handles network requests
// Display AI suggestions
function displaySuggestions(suggestions) {
    currentSuggestions = suggestions;
    suggestionsList.innerHTML = '';
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<p style="text-align: center; color: var(--figma-color-text-secondary); margin: 20px 0;">No suggestions available for the current selection.</p>';
        suggestionsContainer.classList.add('show');
        return;
    }
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = createSuggestionElement(suggestion, index);
        suggestionsList.appendChild(suggestionElement);
    });
    suggestionsContainer.classList.add('show');
}
// Create individual suggestion element
function createSuggestionElement(suggestion, index) {
    const element = document.createElement('div');
    element.className = 'suggestion-item';
    const confidencePercent = Math.round(suggestion.confidence * 100);
    const confidenceColor = confidencePercent > 80 ? '#2ed573' : confidencePercent > 60 ? '#ffa502' : '#ff4757';
    element.innerHTML = `
    <div class="suggestion-header">
      <span class="suggestion-type">${suggestion.type}</span>
      <span class="confidence" style="color: ${confidenceColor}">
        ${confidencePercent}% confidence
      </span>
    </div>
    
    <div class="suggestion-content">
      <div class="suggestion-text">${suggestion.reasoning}</div>
      
      <div class="value-comparison">
        <span class="current">Current: ${formatValue(suggestion.currentValue)}</span>
        <span>→</span>
        <span class="suggested">Suggested: ${formatValue(suggestion.suggestedValue)}</span>
      </div>
    </div>
    
    <div class="suggestion-actions">
      <button class="button" onclick="applySuggestion(${index})">
        Apply Change
      </button>
      <button class="button secondary" onclick="previewSuggestion(${index})">
        Preview
      </button>
      <button class="button secondary" onclick="dismissSuggestion(${index})">
        Dismiss
      </button>
    </div>
  `;
    return element;
}
// Format values for display
function formatValue(value) {
    if (typeof value === 'object' && value !== null) {
        if (value.r !== undefined && value.g !== undefined && value.b !== undefined) {
            // Color object
            const r = Math.round(value.r * 255);
            const g = Math.round(value.g * 255);
            const b = Math.round(value.b * 255);
            return `rgb(${r}, ${g}, ${b})`;
        }
        return JSON.stringify(value);
    }
    if (typeof value === 'number') {
        return Math.round(value * 100) / 100 + '';
    }
    return String(value);
}
// Apply suggestion
function applySuggestion(index) {
    if (index >= 0 && index < currentSuggestions.length) {
        const suggestion = currentSuggestions[index];
        parent.postMessage({
            pluginMessage: {
                type: 'apply-suggestion',
                suggestion: suggestion
            }
        }, '*');
    }
}
// Preview suggestion (placeholder - would need more complex implementation)
function previewSuggestion(index) {
    showSuccessMessage('Preview functionality would be implemented here');
}
// Dismiss suggestion
function dismissSuggestion(index) {
    if (index >= 0 && index < currentSuggestions.length) {
        const suggestionElement = suggestionsList.children[index];
        suggestionElement.style.opacity = '0.5';
        suggestionElement.style.pointerEvents = 'none';
        // Remove from array
        currentSuggestions.splice(index, 1);
    }
}
// Handle suggestion applied confirmation
function handleSuggestionApplied(suggestion) {
    showSuccessMessage(`Applied ${suggestion.type} suggestion successfully!`);
    // Refresh suggestions by re-analyzing
    setTimeout(() => {
        parent.postMessage({
            pluginMessage: { type: 'analyze-selection' }
        }, '*');
    }, 1000);
}
// Show error message
function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}
// Show success message
function showSuccessMessage(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
    // Auto-hide after 3 seconds
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}
// Show debug message
function showDebugMessage(message) {
    console.log('DEBUG:', message);
    // Show in dedicated debug output area
    if (debugOutput && debugMessages) {
        debugOutput.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        const debugLine = document.createElement('div');
        debugLine.innerHTML = `<span style="color: #888">[${timestamp}]</span> ${message}`;
        debugMessages.appendChild(debugLine);
        // Scroll to bottom
        debugOutput.scrollTop = debugOutput.scrollHeight;
        // Limit to 20 messages
        while (debugMessages.children.length > 20) {
            debugMessages.removeChild(debugMessages.firstChild);
        }
    }
    // Also show in UI temporarily
    showSuccessMessage(`DEBUG: ${message}`);
}
// Hide all messages
function hideMessages() {
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
}
// Expose functions to global scope for onclick handlers
window.toggleConfig = toggleConfig;
window.saveConfig = saveConfig;
window.applySuggestion = applySuggestion;
window.previewSuggestion = previewSuggestion;
window.dismissSuggestion = dismissSuggestion;
console.log('CXS AI Chat Request UI loaded');
