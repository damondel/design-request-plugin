# Deploy Azure Functions directly (not Static Web Apps)
# This should avoid the CORS issues we had with SWA

$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"  
$functionAppName = "figma-plugin-func-$(Get-Random -Minimum 1000 -Maximum 9999)"
$storageAccountName = "figmapluginstor$(Get-Random -Minimum 100 -Maximum 999)"

Write-Host "Creating standalone Azure Functions app (not Static Web Apps)"
Write-Host "This should have proper CORS control"

# Create storage account for Functions
Write-Host "Creating storage account..."
az storage account create `
    --name $storageAccountName `
    --location $location `
    --resource-group $resourceGroup `
    --sku Standard_LRS

if ($LASTEXITCODE -eq 0) {
    Write-Host "Storage account created"
    
    # Create Function App on Consumption plan
    Write-Host "Creating Function App..."
    az functionapp create `
        --resource-group $resourceGroup `
        --consumption-plan-location $location `
        --runtime node `
        --runtime-version 18 `
        --functions-version 4 `
        --name $functionAppName `
        --storage-account $storageAccountName

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS! Function App created"
        Write-Host "Function App URL: https://$functionAppName.azurewebsites.net"
        Write-Host "Now we'll deploy your functions with proper CORS"
        
        # Configure CORS properly
        Write-Host "Configuring CORS..."
        az functionapp cors add --name $functionAppName --resource-group $resourceGroup --allowed-origins "*"
        
        Write-Host "Next steps:"
        Write-Host "1. Deploy your function code"
        Write-Host "2. Configure environment variables"
        Write-Host "3. Update Figma plugin endpoint"
        
    } else {
        Write-Host "ERROR: Failed to create Function App"
    }
} else {
    Write-Host "ERROR: Failed to create storage account"
}