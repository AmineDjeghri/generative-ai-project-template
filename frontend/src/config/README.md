# Import Configuration

This directory contains configuration files for controlling import functionality through feature flags.

## importConfig.ts

This file controls which import methods are available and various import settings.

### Import Methods

Each import method has the following properties:
- `id`: Unique identifier for the method
- `name`: Display name
- `icon`: Emoji icon
- `description`: Description text
- `color`: CSS gradient for the method card
- `enabled`: Feature flag to enable/disable the method

### Current Configuration

By default, only CSV upload is enabled:

```typescript
{
  id: 'csv',
  name: 'CSV Upload',
  icon: '📄',
  description: 'Upload a CSV file with your product data',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  enabled: true // Only CSV is enabled by default
}
```

### Enabling Additional Methods

To enable other import methods, change their `enabled` property to `true`:

```typescript
// Enable Shopify
{
  id: 'shopify',
  name: 'Shopify',
  icon: '🛍️',
  description: 'Connect to your Shopify store via API',
  color: 'linear-gradient(135deg, #95bf47 0%, #5e8e3e 100%)',
  enabled: true // Change from false to true
}

// Enable WooCommerce
{
  id: 'woocommerce',
  name: 'WooCommerce',
  icon: '🔌',
  description: 'Import from WordPress WooCommerce store',
  color: 'linear-gradient(135deg, #96588a 0%, #7c3aed 100%)',
  enabled: true // Change from false to true
}
```

### Import Settings

The `importConfig` object controls various import settings:

```typescript
export const importConfig = {
  // Maximum file size for CSV uploads (in bytes)
  maxFileSize: 10 * 1024 * 1024, // 10MB

  // Supported file formats
  supportedFormats: ['csv', 'xlsx', 'xls'],

  // Default scheduling option
  defaultSchedule: 'once',

  // Whether to show notifications option
  showNotifications: true,

  // Whether to show API configuration for non-CSV methods
  showApiConfig: false
};
```

### Helper Functions

- `getEnabledImportMethods()`: Returns only the enabled import methods
- `isImportMethodEnabled(methodId)`: Checks if a specific method is enabled

### Usage Example

```typescript
import { getEnabledImportMethods, isImportMethodEnabled, importConfig } from './config/importConfig';

// Get only enabled methods
const enabledMethods = getEnabledImportMethods();

// Check if a method is enabled
const isShopifyEnabled = isImportMethodEnabled('shopify');

// Use configuration settings
const maxFileSize = importConfig.maxFileSize;
```

### Environment-Based Configuration

For different environments (development, staging, production), you can create separate configuration files:

- `importConfig.dev.ts`
- `importConfig.staging.ts`
- `importConfig.prod.ts`

And import the appropriate one based on your environment variables.
