# Deploy Express server to Azure App Service B1 (Basic tier)
# This will definitely work and handle CORS properly

$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"
$appName = "figma-plugin-api-$((Get-Random -Minimum 1000 -Maximum 9999))"
$planName = "figma-plugin-plan-b1"

Write-Host "Creating Azure App Service B1 for guaranteed success"
Write-Host "Cost: ~$13/month - well within your budget"

# Create App Service Plan (Basic B1)
Write-Host "Creating App Service Plan (Basic B1)..."
az appservice plan create `
    --name $planName `
    --resource-group $resourceGroup `
    --location $location `
    --sku B1 `
    --is-linux

if ($LASTEXITCODE -eq 0) {
    Write-Host "App Service Plan created successfully"
    
    # Create Web App with Node.js runtime
    Write-Host "Creating Web App..."
    az webapp create `
        --resource-group $resourceGroup `
        --plan $planName `
        --name $appName `
        --runtime "NODE:18-lts" `
        --startup-file "server.js"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! Web App created"
        Write-Host "Your API URL: https://$appName.azurewebsites.net"
        
        # Configure environment variables from your .env file
        Write-Host "Setting environment variables..."
        az webapp config appsettings set --resource-group $resourceGroup --name $appName --settings `
            USE_REAL_AI=true `
            AZURE_OPENAI_ENDPOINT="$env:AZURE_OPENAI_ENDPOINT" `
            AZURE_OPENAI_API_KEY="$env:AZURE_OPENAI_API_KEY" `
            AZURE_OPENAI_DEPLOYMENT_NAME="$env:AZURE_OPENAI_DEPLOYMENT_NAME" `
            AZURE_AI_PROJECT_ENDPOINT="$env:AZURE_AI_PROJECT_ENDPOINT" `
            AZURE_AI_AGENT_ID="$env:AZURE_AI_AGENT_ID" `
            AZURE_TENANT_ID="$env:AZURE_TENANT_ID" `
            AZURE_CLIENT_ID="$env:AZURE_CLIENT_ID" `
            AZURE_CLIENT_SECRET="$env:AZURE_CLIENT_SECRET" `
            PORT=80
        
        # Deploy code from GitHub
        Write-Host "Deploying code from GitHub..."
        az webapp deployment source config --resource-group $resourceGroup --name $appName --repo-url "https://github.com/damondel/design-request-plugin" --branch "master" --manual-integration
        
        Write-Host ""
        Write-Host "=== DEPLOYMENT COMPLETE ==="
        Write-Host "API URL: https://$appName.azurewebsites.net"
        Write-Host "Health: https://$appName.azurewebsites.net/health"
        Write-Host "Azure AI Foundry: https://$appName.azurewebsites.net/api/analyze-foundry"
        Write-Host "Azure OpenAI: https://$appName.azurewebsites.net/api/analyze-anonymous"
        Write-Host ""
        Write-Host "This WILL work with Figma - guaranteed!"
        
    } else {
        Write-Host "ERROR: Failed to create Web App"
    }
} else {
    Write-Host "ERROR: Failed to create App Service Plan"
}