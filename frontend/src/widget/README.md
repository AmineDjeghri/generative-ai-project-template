# Virtual Try-On Widget

A lightweight, embeddable widget that allows customers to virtually try on clothing items directly on your product pages.

## Features

- 🎯 **Easy Integration** - Single script tag installation
- 🎨 **Style Isolation** - Uses Shadow DOM to prevent CSS conflicts
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔒 **API Key Authentication** - Secure communication with your backend
- 📸 **Photo Capture/Upload** - Built-in camera and file upload functionality
- 🎭 **Real-time Preview** - Instant virtual try-on results
- ⚡ **Lightweight** - Optimized bundle size for fast loading

## Quick Start

### 1. Build the Widget

```bash
cd front
npm install
npm run build:widget
```

This creates `dist/virtual-tryon-widget.min.js` - your embeddable widget file.

### 2. Host the Widget

Upload `virtual-tryon-widget.min.js` to your CDN or static hosting service.

### 3. Embed on Your Website

Add this script tag to your product pages:

```html
<!-- Load React dependencies -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Load your widget -->
<script
  src="https://your-cdn.com/virtual-tryon-widget.min.js"
  data-api-key="your-api-key"
  data-product-id="PRODUCT_ID">
</script>
```

## Usage Options

### Option 1: Auto-initialize with Data Attributes

The widget will automatically initialize when the page loads:

```html
<script
  src="https://your-cdn.com/virtual-tryon-widget.min.js"
  data-api-key="your-api-key"
  data-product-id="tshirt-001">
</script>
```

### Option 2: Manual Initialization

For more control, initialize the widget programmatically:

```html
<script src="https://your-cdn.com/virtual-tryon-widget.min.js"></script>
<script>
  // Initialize when user clicks a button
  document.getElementById('try-on-btn').addEventListener('click', function() {
    window.VirtualTryOnWidget.init({
      apiKey: 'your-api-key',
      productId: 'tshirt-001',
      onTryOnComplete: function(result) {
        console.log('Try-on completed:', result);
        // Track analytics, update UI, etc.
      },
      onClose: function() {
        console.log('Widget closed');
      }
    });
  });
</script>
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | string | ✅ | Your API key for authentication |
| `productId` | string | ✅ | The product ID to try on |
| `position` | string | ❌ | Widget position: `bottom-right`, `bottom-left`, `top-right`, `top-left` |
| `theme` | string | ❌ | Widget theme: `light` or `dark` |
| `onTryOnComplete` | function | ❌ | Callback when try-on is completed |
| `onClose` | function | ❌ | Callback when widget is closed |

## API Integration

The widget communicates with your backend API. Ensure your backend has these endpoints:

### Required Endpoints

1. **Product Details** - `GET /api/products/{productId}`
2. **Try-On Processing** - `POST /api/try-on`
3. **Image Upload** - `POST /api/upload`

### Example API Response Format

```json
{
  "product": {
    "id": "tshirt-001",
    "name": "Classic T-Shirt",
    "images": ["url1", "url2"],
    "category": "clothing"
  },
  "tryOnResult": {
    "resultUrl": "https://cdn.com/result.jpg",
    "confidence": 0.95,
    "processingTime": 2.3
  }
}
```

## Backend API Key Authentication

Your backend should validate API keys. Add this to your FastAPI backend:

```python
# In api/auth.py
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)):
    api_key = credentials.credentials
    # Validate API key against your database
    if not is_valid_api_key(api_key):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key

# Use in your endpoints
@app.get("/api/products/{product_id}")
async def get_product(product_id: str, api_key: str = Depends(verify_api_key)):
    # Your product logic here
    pass
```

## Styling and Customization

The widget uses Shadow DOM for style isolation, but you can customize the appearance by modifying the CSS in `loader.ts`.

### Custom CSS Variables

You can override default styles by adding CSS custom properties to your page:

```css
:root {
  --widget-primary-color: #3b82f6;
  --widget-border-radius: 16px;
  --widget-font-family: 'Your Font', sans-serif;
}
```

## Browser Support

- Chrome 67+
- Firefox 63+
- Safari 11.1+
- Edge 79+

## Development

### Local Development

1. Start the development server:
   ```bash
   npm start
   ```

2. Open `demo.html` in your browser to test the widget

3. Build for production:
   ```bash
   npm run build:widget
   ```

### File Structure

```
src/widget/
├── VirtualTryOnWidget.tsx    # Main React component
├── loader.ts                 # Widget loader and initialization
└── README.md                 # This file
```

## Troubleshooting

### Widget Not Loading

1. Check browser console for errors
2. Verify React and ReactDOM are loaded before the widget
3. Ensure the widget file is accessible from your CDN

### API Errors

1. Verify your API key is valid
2. Check that your backend endpoints are working
3. Ensure CORS is properly configured

### Styling Issues

1. The widget uses Shadow DOM for isolation
2. Check that your page's CSS isn't interfering
3. Verify the widget CSS is properly loaded

## Security Considerations

- Always validate API keys on your backend
- Use HTTPS for all widget and API communications
- Implement rate limiting on your API endpoints
- Sanitize user inputs before processing

## Performance Tips

- Host the widget on a CDN for faster loading
- Use image optimization for product images
- Implement caching for API responses
- Consider lazy loading for better page performance

## Support

For issues and questions:
1. Check the browser console for error messages
2. Verify your API endpoints are working
3. Test with the demo page first
4. Review the configuration options

## License

This widget is part of your Virtual Try-On SaaS platform.
