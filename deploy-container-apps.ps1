# Azure Container Apps Deployment - Serverless containers with better quota
# This should work around the App Service quota limitations

$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"
$containerAppName = "figma-plugin-api"
$environmentName = "figma-plugin-env"

Write-Host "Creating Azure Container App for Figma Plugin API"
Write-Host "This is serverless - only pay when requests come in"

# Create Container Apps environment
Write-Host "Creating Container Apps environment..."
az containerapp env create `
    --name $environmentName `
    --resource-group $resourceGroup `
    --location $location

if ($LASTEXITCODE -eq 0) {
    Write-Host "Environment created successfully"
    
    # Create the container app with our Express server
    Write-Host "Creating Container App..."
    az containerapp create `
        --name $containerAppName `
        --resource-group $resourceGroup `
        --environment $environmentName `
        --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" `
        --target-port 80 `
        --ingress external `
        --query properties.configuration.ingress.fqdn
    
    if ($LASTEXITCODE -eq 0) {
        # Get the URL
        $appUrl = az containerapp show --name $containerAppName --resource-group $resourceGroup --query properties.configuration.ingress.fqdn --output tsv
        
        Write-Host "SUCCESS! Container App created"
        Write-Host "Temporary URL: https://$appUrl"
        Write-Host "Next: We'll update this with your actual API container"
        Write-Host "Cost: Serverless - only pay for actual usage (very low for POC)"
    } else {
        Write-Host "ERROR: Failed to create Container App"
    }
} else {
    Write-Host "ERROR: Failed to create Container Apps environment"
}