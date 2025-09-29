# Deploy script for Azure Container Instances
# This script will create and deploy your Figma plugin API to ACI

# Variables
$resourceGroup = "rg-figma-plugin-poc"
$containerName = "figma-plugin-api"
$imageName = "figma-plugin-api:latest"
$acrName = "figmapluginstestregistry" # Will create if needed

Write-Host "🚀 Deploying Figma Plugin API to Azure Container Instances"
Write-Host "💰 Estimated cost: ~$8-10/month when running"

# Step 1: Create Azure Container Registry (if needed)
Write-Host "📦 Setting up Azure Container Registry..."
az acr create --resource-group $resourceGroup --name $acrName --sku Basic --admin-enabled true

# Step 2: Build and push Docker image
Write-Host "🔨 Building Docker image..."
docker build -t $imageName .

Write-Host "📤 Pushing to Azure Container Registry..."
az acr login --name $acrName
docker tag $imageName "$acrName.azurecr.io/$imageName"
docker push "$acrName.azurecr.io/$imageName"

# Step 3: Get ACR credentials
$acrServer = az acr show --name $acrName --query loginServer --output tsv
$acrUser = az acr credential show --name $acrName --query username --output tsv
$acrPassword = az acr credential show --name $acrName --query passwords[0].value --output tsv

# Step 4: Create Container Instance
Write-Host "🐳 Creating Azure Container Instance..."
az container create `
  --resource-group $resourceGroup `
  --name $containerName `
  --image "$acrServer/$imageName" `
  --registry-login-server $acrServer `
  --registry-username $acrUser `
  --registry-password $acrPassword `
  --dns-name-label "figma-plugin-api-unique" `
  --ports 80 `
  --environment-variables `
    AZURE_AI_PROJECT_ENDPOINT=$env:AZURE_AI_PROJECT_ENDPOINT `
    AZURE_AI_AGENT_ID=$env:AZURE_AI_AGENT_ID `
    AZURE_TENANT_ID=$env:AZURE_TENANT_ID `
    AZURE_CLIENT_ID=$env:AZURE_CLIENT_ID `
    AZURE_CLIENT_SECRET=$env:AZURE_CLIENT_SECRET

# Step 5: Get the public URL
$publicUrl = az container show --resource-group $resourceGroup --name $containerName --query ipAddress.fqdn --output tsv

Write-Host "✅ Deployment complete!"
Write-Host "🌐 Your API is available at: http://$publicUrl"
Write-Host "🏥 Health check: http://$publicUrl/health"
Write-Host "🤖 Azure AI Foundry: http://$publicUrl/api/analyze-foundry"
Write-Host "🧠 Azure OpenAI: http://$publicUrl/api/analyze-anonymous"
Write-Host ""
Write-Host "💡 To stop the container (and save costs): az container stop --name $containerName --resource-group $resourceGroup"
Write-Host "💡 To start it again: az container start --name $containerName --resource-group $resourceGroup"