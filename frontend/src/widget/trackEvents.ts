import { getApiBaseUrl } from './apiUtils';

// Event names for analytics
export const WidgetAnalyticsEvents = {
  WIDGET_OPENED: 'widget_opened',
  PRODUCT_VIEWED: 'product_viewed',
  PHOTO_CAPTURE_STARTED: 'photo_capture_started',
  PHOTO_CAPTURED: 'photo_captured',
  PHOTO_UPLOAD_STARTED: 'photo_upload_started',
  PHOTO_UPLOADED: 'photo_uploaded',
  TRYON_GENERATION_STARTED: 'tryon_generation_started',
  TRYON_GENERATION_SUCCESS: 'tryon_generation_success',
  TRYON_GENERATION_FAILED: 'tryon_generation_failed',
  TRY_AGAIN_CLICKED: 'try_again_clicked',
  WIDGET_CLOSED: 'widget_closed',
  ERROR_EVENT: 'error_event',
};

// The endpoint to send analytics events to (update as needed)
const ANALYTICS_ENDPOINT = `${getApiBaseUrl()}/api/widget-analytics`;

// Main tracking function
export function trackEvent(event: string, data: Record<string, any> = {}) {
  const payload = {
    event,
    // apiKey should be included in data by the widget
    timestamp: new Date().toISOString(),
    ...data,
  };

  // Fire and forget (no await)
  fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    // Optionally log to console for debugging
    console.warn('Analytics event failed to send', err);
  });
}
