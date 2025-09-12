# AI Design Assistant - Quick Setup Guide

## 🚀 One-Command Setup

Run these commands to get everything running:

### Windows (PowerShell)
```powershell
# Install plugin dependencies
npm install

# Install API server dependencies  
cd api; npm install; cd ..

# Build the plugin
npm run build

# Start the AI server (in new terminal)
Start-Process powershell -ArgumentList "npm run start-api"

# Success! 
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host "🔗 AI Server: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📖 Next: Load manifest.json in Figma" -ForegroundColor Yellow
```

### macOS/Linux
```bash
#!/bin/bash
# Install plugin dependencies
npm install

# Install API server dependencies
cd api && npm install && cd ..

# Build the plugin  
npm run build

# Start the AI server (in background)
npm run start-api &

echo "✅ Setup complete!"
echo "🔗 AI Server: http://localhost:3001"
echo "📖 Next: Load manifest.json in Figma"
```

## 📋 Manual Setup Steps

If you prefer step-by-step setup:

1. **Install Plugin Dependencies**
   ```bash
   npm install
   ```

2. **Install API Server Dependencies**
   ```bash
   cd api
   npm install
   cd ..
   ```

3. **Build the Plugin**
   ```bash
   npm run build
   ```

4. **Start the AI Server**
   ```bash
   npm run start-api
   ```
   Keep this terminal open - the server needs to run continuously.

5. **Load Plugin in Figma**
   - Open Figma Desktop App
   - Go to **Plugins** → **Development** → **Import plugin from manifest**
   - Select `manifest.json` from this directory

## 🧪 Test the Setup

1. **Verify API Server**
   - Open http://localhost:3001/health in your browser
   - You should see: `{"status":"healthy",...}`

2. **Test Plugin**
   - Create a rectangle in Figma
   - Run "AI Design Assistant" plugin
   - Select the rectangle and click "Analyze Selection"
   - You should see AI suggestions appear

## 🔧 Configuration

The plugin is pre-configured to work with the local mock server, but you can customize:

- **API Endpoint**: Change in plugin configuration panel
- **Analysis Type**: Choose from dropdown in plugin UI  
- **API Key**: Optional, use `test-api-key-12345` for mock server

## 🆘 Troubleshooting

### Plugin Won't Load
```bash
# Rebuild TypeScript
npm run build

# Check for compilation errors
tsc --noEmit
```

### API Connection Failed
```bash
# Check if server is running
curl http://localhost:3001/health

# Restart server if needed
npm run start-api
```

### Port Already in Use
```bash
# Kill process on port 3001
npx kill-port 3001

# Or change port in api/server.js
const PORT = process.env.PORT || 3002;
```

## 🎯 Next Steps

Once setup is complete:

1. **Explore the Code**: Review `code.ts` and `ui.ts` to understand the integration
2. **Modify AI Logic**: Update `api/server.js` to integrate your AI model
3. **Customize UI**: Modify `ui.html` and `ui.ts` for your use case
4. **Deploy**: Follow deployment guide in README.md

## 📚 Resources

- **Main Documentation**: README.md
- **API Docs**: http://localhost:3001/api/docs  
- **Figma Plugin Docs**: https://www.figma.com/plugin-docs/

Happy coding! 🎨✨