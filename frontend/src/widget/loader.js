import React from 'react';
import ReactDOM from 'react-dom';
import VirtualTryOnWidget from './VirtualTryOnWidget';

// Backend API endpoint for fetching widget config
const WIDGET_CONFIG_API_URL = `http://localhost:8000/api/widget/config-by-api-key`;

class VirtualTryOnWidgetLoader {
  constructor(config) {
    this.container = null;
    this.config = config;
  }

  createContainer() {
    // Create overlay container in the main document
    const overlay = document.createElement('div');
    overlay.id = 'virtual-tryon-widget-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      background: rgba(30, 41, 59, 0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      transition: opacity 0.3s;
    `;

    // Create widget content container (for Shadow DOM)
    const widgetContent = document.createElement('div');
    widgetContent.id = 'virtual-tryon-widget-content';
    widgetContent.style.cssText = 'pointer-events: auto;';
    overlay.appendChild(widgetContent);

    return { overlay, widgetContent };
  }

  async fetchConfig(apiKey) {
    const res = await fetch(`${WIDGET_CONFIG_API_URL}?api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.config || null;
  }

  async init() {
    this.destroy();
    const { overlay, widgetContent } = this.createContainer();
    this.container = overlay;
    document.body.appendChild(this.container);

    // Fetch config from backend
    const configFromBackend = await this.fetchConfig(this.config.apiKey);

    // Render React component into the widget content
    ReactDOM.render(
      React.createElement(VirtualTryOnWidget, {
        apiKey: this.config.apiKey,
        productId: this.config.productId,
        config: configFromBackend, // pass config as prop
        onClose: () => {
          this.destroy();
          this.config.onClose?.();
        },
        onTryOnComplete: (result) => {
          this.config.onTryOnComplete?.(result);
        }
      }),
      widgetContent
    );
  }

  destroy() {
    if (this.container) {
      const widgetContent = this.container.querySelector('#virtual-tryon-widget-content');
      if (widgetContent) {
        ReactDOM.unmountComponentAtNode(widgetContent);
      }
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
    }
  }
}

// Auto-initialize if script tag has data attributes
const scriptTag = document.currentScript;
if (scriptTag) {
  const apiKey = scriptTag.getAttribute('data-api-key');
  const productId = scriptTag.getAttribute('data-product-id');
  if (apiKey && productId) {
    const widget = new VirtualTryOnWidgetLoader({ apiKey, productId });
    setTimeout(() => {
      widget.init();
    }, 100);
  }
}

window.VirtualTryOnWidget = {
  init: (config) => {
    const widget = new VirtualTryOnWidgetLoader(config);
    widget.init();
    return widget;
  },
  destroy: () => {
    const existingOverlay = document.getElementById('virtual-tryon-widget-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
  }
};

export default VirtualTryOnWidgetLoader;
