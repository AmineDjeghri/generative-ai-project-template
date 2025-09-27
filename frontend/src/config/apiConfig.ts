import { getApiBaseUrl } from '../widget/apiUtils';

// Use getApiBaseUrl for BASE_URL.
export const API_CONFIG = {
  // Base URL for API endpoints
  BASE_URL: getApiBaseUrl() + '/api',

  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/login',
    REGISTER: '/register',

    // Product endpoints
    PRODUCTS: '/products',
    ADD_PRODUCT: '/products/add-single',

    // Image endpoints
    IMAGES: '/images',
  },
  WIDGET_CONFIG: '/widget/config',
  WIDGET_EMBED_CODE: '/widget/embed-code',
  WIDGET_REGENERATE_API_KEY: '/widget/regenerate-api-key',
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for API calls with common headers
export const apiCall = async (endpoint: string, options: RequestInit = {}, token?: string) => {
  const url = buildApiUrl(endpoint);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add existing headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

// Helper function to get authenticated image URL
export const getAuthenticatedImageUrl = async (imagePath: string, token?: string): Promise<string> => {
  if (!token) {
    throw new Error('Token required to access images');
  }

  const url = buildApiUrl(imagePath);
  console.log('Making request to:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Response error:', errorText);
    throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

// Helper function for multipart form data (product with images)
export const addProductWithImages = async (productData: any, images: File[], token?: string) => {
  const url = buildApiUrl(API_CONFIG.ENDPOINTS.ADD_PRODUCT);
  const formData = new FormData();

  // Add product fields
  formData.append('name', productData.name);
  formData.append('sku', productData.sku);
  if (productData.price) formData.append('price', productData.price.toString());
  if (productData.page_url) formData.append('page_url', productData.page_url);
  if (productData.category) formData.append('category', productData.category);

  // Add images
  images.forEach((image, index) => {
    formData.append('images', image);
  });

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    method: 'POST',
    body: formData,
    headers,
  });
};

// Specific API functions
export const api = {
  // Product endpoints
  getProducts: (token?: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  addProduct: (formData: FormData, token?: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADD_PRODUCT}`, { method: 'POST', body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  addProductWithImages: (productData: any, images: File[], token?: string) =>
    addProductWithImages(productData, images, token),
  deleteProduct: (productId: string, token?: string) => fetch(`${API_CONFIG.BASE_URL}/products/${productId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  }),

  // Image endpoints
  getAuthenticatedImageUrl: (imagePath: string, token?: string) =>
    getAuthenticatedImageUrl(imagePath, token),

  // Auth endpoints
  login: (formData: FormData) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, { method: 'POST', body: formData }),
  register: (body: any) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  getWidgetConfig: (token: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.WIDGET_CONFIG}`, { headers: { Authorization: `Bearer ${token}` } }),
  saveWidgetConfig: (config: any, token: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.WIDGET_CONFIG}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(config) }),
  getWidgetEmbedCode: (token: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.WIDGET_EMBED_CODE}`, { headers: { Authorization: `Bearer ${token}` } }),
  regenerateApiKey: (token: string) => fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.WIDGET_REGENERATE_API_KEY}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
};
