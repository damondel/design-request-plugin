# Create Azure App Service for Figma Plugin API
$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"
$appName = "figma-plugin-api-$((Get-Random -Minimum 1000 -Maximum 9999))"
$planName = "figma-plugin-plan"

Write-Host "Creating Azure App Service for Figma Plugin API"
Write-Host "Starting with Free tier (F1) - FREE"

# Create App Service Plan (Free tier)
Write-Host "Creating App Service Plan (Free tier)..."
az appservice plan create --name $planName --resource-group $resourceGroup --location $location --sku F1 --is-linux

if ($LASTEXITCODE -eq 0) {
    Write-Host "App Service Plan created successfully"
    
    # Create Web App with Node.js runtime  
    Write-Host "Creating Web App..."
    az webapp create --resource-group $resourceGroup --plan $planName --name $appName --runtime "NODE:18-lts"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: Web App created!"
        Write-Host "Your API URL: https://$appName.azurewebsites.net"
        Write-Host "This will have proper CORS and should work with Figma!"
    } else {
        Write-Host "ERROR: Failed to create Web App"
    }
} else {
    Write-Host "ERROR: Failed to create App Service Plan"
}