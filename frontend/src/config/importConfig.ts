// Import methods configuration
export interface ImportMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  enabled: boolean;
}

export const importMethods: ImportMethod[] = [
  {
    id: 'csv',
    name: 'CSV/Excel Upload',
    icon: '📄',
    description: 'Upload a CSV or Excel file with your product data',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    enabled: true // Only CSV is enabled by default
  },
  {
    id: 'shopify',
    name: 'Shopify',
    icon: '🛍️',
    description: 'Connect to your Shopify store via API',
    color: 'linear-gradient(135deg, #95bf47 0%, #5e8e3e 100%)',
    enabled: false // Disabled by default
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    icon: '🔌',
    description: 'Import from WordPress WooCommerce store',
    color: 'linear-gradient(135deg, #96588a 0%, #7c3aed 100%)',
    enabled: false // Disabled by default
  },
  {
    id: 'prestashop',
    name: 'PrestaShop',
    icon: '🛒',
    description: 'Connect to your PrestaShop e-commerce',
    color: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
    enabled: false // Disabled by default
  }
];

// Helper function to get only enabled methods
export const getEnabledImportMethods = (): ImportMethod[] => {
  return importMethods.filter(method => method.enabled);
};

// Helper function to check if a specific method is enabled
export const isImportMethodEnabled = (methodId: string): boolean => {
  const method = importMethods.find(m => m.id === methodId);
  return method?.enabled || false;
};

// Configuration for import settings
export const importConfig = {
  // Maximum file size for CSV uploads (in bytes)
  maxFileSize: 200 * 1024 * 1024, // 200MB

  // Supported file formats
  supportedFormats: ['csv', 'xlsx', 'xls'],

  // Default scheduling options
  defaultSchedule: 'once',

  // Whether to show notifications option
  showNotifications: true,

  // Whether to show API configuration for non-CSV methods
  showApiConfig: false
};
