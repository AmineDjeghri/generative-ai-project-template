import React from 'react';
import ReactDOM from 'react-dom';
import VirtualTryOnWidget from './VirtualTryOnWidget';
import { defaultWidgetConfig } from './defaultWidgetConfig';
import { getApiBaseUrl } from './apiUtils';

interface WidgetConfig {
  apiKey: string;
  productId: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
  onTryOnComplete?: (result: any) => void;
  onClose?: () => void;
}

class VirtualTryOnWidgetLoader {
  private container: HTMLDivElement | null = null;
  private config: WidgetConfig;

  constructor(config: WidgetConfig) {
    this.config = config;
  }

  private createContainer(): HTMLDivElement {
    // Create simple container without shadow DOM for better event handling
    const container = document.createElement('div');
    container.id = 'virtual-tryon-widget-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      pointer-events: auto;
    `;

    return container;
  }

  public async init(): Promise<void> {
    // Remove existing widget if present
    this.destroy();

    // Create new container
    this.container = this.createContainer();
    document.body.appendChild(this.container);

    // Show loading spinner while fetching config
    this.container.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background-color: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90vw;
          max-height: 80vh;
          overflow: hidden;
          position: relative;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e5e7eb;
            background-color: #f9fafb;
          ">
            <h3 style="margin: 0; font-size: 20px; font-weight: 600; color: #111827;">Virtual Try-On</h3>
          </div>
          <div style="padding: 24px;">
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 60px;
              text-align: center;
            ">
              <div style="
                width: 40px;
                height: 40px;
                border: 4px solid #e5e7eb;
                border-top: 4px solid #3b82f6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              "></div>
              <p style="margin-top: 16px; color: #6b7280; font-size: 16px;">Loading Virtual Try-On Widget...</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Fetch config from backend using API key
    let fullConfig = { ...defaultWidgetConfig };
    try {
      // Use the same base URL as the demo page
      const BASE_API_URL = getApiBaseUrl();
      const resp = await fetch(`${BASE_API_URL}/api/widget/config-by-api-key?api_key=${encodeURIComponent(this.config.apiKey)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.config) {
          fullConfig = { ...fullConfig, ...data.config };
        }
      }
    } catch (e) {
      // ignore, fallback to default config
    }

    // Render the real widget
    this.container.innerHTML = '';
    if ((ReactDOM as any).createRoot) {
      (ReactDOM as any).createRoot(this.container).render(
        React.createElement(VirtualTryOnWidget, {
          ...this.config,
          config: fullConfig,
          previewMode: false,
          onClose: () => {
            console.log('Widget onClose called, destroying widget');
            this.destroy();
            this.config.onClose?.();
          },
        })
      );
    } else {
      (ReactDOM as any).render(
        React.createElement(VirtualTryOnWidget, {
          ...this.config,
          config: fullConfig,
          previewMode: false,
          onClose: () => {
            console.log('Widget onClose called, destroying widget');
            this.destroy();
            this.config.onClose?.();
          },
        }),
        this.container
      );
    }
  }

  public destroy(): void {
    if (this.container) {
      // Remove container from DOM
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }

      this.container = null;
    }
  }
}

// Auto-initialize if script tag has data attributes
const scriptTag = document.currentScript as HTMLScriptElement;
if (scriptTag) {
  const apiKey = scriptTag.getAttribute('data-api-key');
  const productId = scriptTag.getAttribute('data-product-id');

  if (apiKey && productId) {
    const widget = new VirtualTryOnWidgetLoader({
      apiKey,
      productId
    });

    // Auto-initialize after a short delay to ensure DOM is ready
    setTimeout(() => {
      widget.init();
    }, 100);
  }
}

// Expose global API

window.VirtualTryOnWidget = {
  init: (config: WidgetConfig) => {
    const widget = new VirtualTryOnWidgetLoader(config);
    widget.init();
    return widget;
  },
  destroy: () => {
    const existingContainer = document.getElementById('virtual-tryon-widget-container');
    if (existingContainer) {
      existingContainer.remove();
    }
  }
};

export default VirtualTryOnWidgetLoader;
