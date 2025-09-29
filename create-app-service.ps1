# Create Azure App Service for Figma Plugin API
# This will work immediately and handle CORS properly

$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"
$appName = "figma-plugin-api-$(Get-Random -Minimum 1000 -Maximum 9999)"
$planName = "figma-plugin-plan"

Write-Host "🚀 Creating Azure App Service for Figma Plugin API"
Write-Host "💰 Starting with Free tier (F1) - $0/month"

# Create App Service Plan (Free tier)
Write-Host "📋 Creating App Service Plan (Free tier)..."
az appservice plan create `
    --name $planName `
    --resource-group $resourceGroup `
    --location $location `
    --sku F1 `
    --is-linux

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App Service Plan created"
    
    # Create Web App with Node.js runtime
    Write-Host "🌐 Creating Web App..."
    az webapp create `
        --resource-group $resourceGroup `
        --plan $planName `
        --name $appName `
        --runtime "NODE:18-lts" `
        --deployment-source-url "https://github.com/damondel/design-request-plugin" `
        --deployment-source-branch "master"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Web App created successfully!"
        Write-Host "🌐 Your API URL: https://$appName.azurewebsites.net"
        Write-Host "🏥 Health check: https://$appName.azurewebsites.net/health"
        Write-Host "🤖 Azure AI Foundry: https://$appName.azurewebsites.net/api/analyze-foundry"
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Configure environment variables in Azure portal"
        Write-Host "2. Update Figma plugin to use new endpoint"
        Write-Host "3. Test CORS functionality"
        Write-Host ""
        Write-Host "Cost: FREE with F1 tier (60 CPU minutes/day)"
    } else {
        Write-Host "❌ Failed to create Web App"
    }
} else {
    Write-Host "❌ Failed to create App Service Plan"
}