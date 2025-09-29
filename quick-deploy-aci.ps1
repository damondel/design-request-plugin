# Quick Azure Container Instance Deployment
# This will create a working API endpoint with proper CORS

$resourceGroup = "rg-figma-plugin-poc"
$location = "East US"
$containerName = "figma-plugin-api"
$dnsLabel = "figma-plugin-api-$(Get-Random -Minimum 1000 -Maximum 9999)"

Write-Host "🚀 Creating Azure Container Instance for Figma Plugin API"
Write-Host "💰 Cost: ~$13/month when running (can stop when not in use)"

# Create container group with public IP
Write-Host "🐳 Creating container instance..."
az container create `
    --resource-group $resourceGroup `
    --name $containerName `
    --image "nginx:alpine" `
    --dns-name-label $dnsLabel `
    --ports 80 `
    --cpu 1 `
    --memory 1 `
    --restart-policy Always

if ($LASTEXITCODE -eq 0) {
    # Get the FQDN
    $fqdn = az container show --resource-group $resourceGroup --name $containerName --query ipAddress.fqdn --output tsv
    
    Write-Host "✅ Container created successfully!"
    Write-Host "🌐 Temporary URL: http://$fqdn"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "1. We'll update this with your actual API container"
    Write-Host "2. Configure with your Azure AI credentials" 
    Write-Host "3. Update Figma plugin to use new endpoint"
    Write-Host ""
    Write-Host "💡 To stop (save costs): az container stop --name $containerName --resource-group $resourceGroup"
    Write-Host "💡 To start again: az container start --name $containerName --resource-group $resourceGroup"
} else {
    Write-Host "❌ Failed to create container instance"
    Write-Host "Let's check what went wrong..."
}