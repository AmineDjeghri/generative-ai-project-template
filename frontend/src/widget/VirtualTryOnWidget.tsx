import React, { useState, useRef, useEffect } from 'react';
import { defaultWidgetConfig } from './defaultWidgetConfig';
import type { WidgetConfig } from '../WidgetCustomization';
import { trackEvent, WidgetAnalyticsEvents } from './trackEvents';
import { getApiBaseUrl } from './apiUtils';

export interface VirtualTryOnWidgetProps {
  apiKey?: string;
  productId?: string;
  config?: WidgetConfig;
  onClose?: () => void;
  onTryOnComplete?: (result: any) => void;
  previewMode?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
}

const VirtualTryOnWidget: React.FC<VirtualTryOnWidgetProps> = ({
  apiKey = '',
  productId = '',
  config = {} as Partial<WidgetConfig>,
  onClose,
  onTryOnComplete,
  previewMode = false
} = {}) => {
  const [step, setStep] = useState<'loading' | 'product' | 'photo' | 'preview' | 'processing' | 'result'>('loading');
  const [product, setProduct] = useState<Product | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLongWaitTip, setShowLongWaitTip] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamStartedRef = useRef(false);

  // Merge config with defaults
  const mergedConfig = { ...defaultWidgetConfig, ...config };

  // Set the base API URL (change for production as needed)
  const BASE_API_URL = getApiBaseUrl();

  // Modern, config-driven modal and button styles
  const borderRadius = mergedConfig.buttonStyle === 'rounded' ? 24 : 8;
  const buttonPadding = mergedConfig.buttonSize === 'large' ? '16px 32px' : mergedConfig.buttonSize === 'small' ? '8px 16px' : '12.8px 19.2px';
  const buttonFontSize = mergedConfig.buttonSize === 'large' ? 18 : mergedConfig.buttonSize === 'small' ? 13 : 15;
  const modalWidth = mergedConfig.widgetSize === 'large' ? 480 : mergedConfig.widgetSize === 'small' ? 340 : 400;
  const modalHeight = mergedConfig.widgetSize === 'large' ? 700 : mergedConfig.widgetSize === 'small' ? 480 : 600;

  const primaryButtonStyle = {
    background: mergedConfig.primaryColor,
    color: 'white',
    fontWeight: mergedConfig.fontWeight || 600,
    border: 'none',
    borderRadius,
    boxShadow: '0 2px 8px rgba(44,62,80,0.10)',
    fontFamily: mergedConfig.fontFamily,
    padding: buttonPadding,
    fontSize: buttonFontSize,
    cursor: 'pointer',
    marginBottom: 8,
    transition: 'background 0.2s, transform 0.1s',
  };
  const secondaryButtonStyle = {
    background: mergedConfig.secondaryColor,
    color: 'white',
    fontWeight: mergedConfig.fontWeight || 600,
    border: 'none',
    borderRadius,
    boxShadow: '0 2px 8px rgba(44,62,80,0.10)',
    fontFamily: mergedConfig.fontFamily,
    padding: buttonPadding,
    fontSize: buttonFontSize,
    cursor: 'pointer',
    marginBottom: 8,
    transition: 'background 0.2s, transform 0.1s',
  };
  const modalStyle = {
    backgroundColor: mergedConfig.backgroundColor,
    borderRadius,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    width: modalWidth,
    height: modalHeight,
    overflow: 'hidden',
    position: 'relative' as const,
    padding: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    fontFamily: mergedConfig.fontFamily,
    fontSize: mergedConfig.fontSize,
    color: mergedConfig.textColor,
    transition: 'box-shadow 0.2s, width 0.2s, height 0.2s, background-color 0.2s, border-radius 0.2s',
  };

  const headerStyle = {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: '24px 32px 16px 32px',
    borderBottom: '1.5px solid #e5e7eb',
    background: `linear-gradient(180deg, ${hexToRgba(mergedConfig.primaryColor, 0.20)} 0%, transparent 100%)`,
    color: mergedConfig.primaryColor,
    fontFamily: mergedConfig.fontFamily,
  };

  const titleStyle = {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: mergedConfig.primaryColor,
    letterSpacing: 1.2,
    fontFamily: mergedConfig.fontFamily,
    textShadow: '0 2px 8px rgba(102,126,234,0.10), 0 1px 2px rgba(0,0,0,0.08)',
  };

  const poweredByStyle = {
    textAlign: 'center' as const,
    marginTop: 6,
    marginBottom: 4,
    fontSize: 10,
    color: mergedConfig.textColor, // Using textColor for branding for consistency
    fontFamily: mergedConfig.fontFamily,
  };

  // Styles object defined inside the component where mergedConfig is available
  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    title: {
      margin: 0,
      fontSize: 20,
      fontWeight: 600,
      fontFamily: mergedConfig.fontFamily,
      color: mergedConfig.primaryColor,
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 19.2,
    },
    spinner: {
      width: 48,
      height: 48,
      border: '6px solid #e5e7eb',
      borderTop: `6px solid ${mergedConfig.primaryColor}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 18px auto'
    },
    loadingText: {
      marginTop: 9.6,
      fontSize: 16,
      color: mergedConfig.textColor,
      fontFamily: mergedConfig.fontFamily,
    },
    productImage: {
      width: '100%',
      maxWidth: 120,
      height: 'auto',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      aspectRatio: '1 / 1',
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    productInfo: {
      textAlign: 'center' as const,
    },
    productName: {
      margin: '0 0 6.4px 0',
      fontSize: 20,
      fontWeight: 600,
      color: mergedConfig.textColor,
      fontFamily: mergedConfig.fontFamily,
    },
    productPrice: {
      margin: '0 0 3.2px 0',
      fontSize: 18,
      fontWeight: 700,
      color: mergedConfig.primaryColor,
      fontFamily: mergedConfig.fontFamily,
    },
    productCategory: {
      margin: 0,
      fontSize: 14,
      color: mergedConfig.secondaryColor,
      fontFamily: mergedConfig.fontFamily,
    },
    actionSection: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      padding: '0 19.2px 12px 19.2px',
    },
    webcamSection: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      padding: 19.2,
      flex: 1,
    },
    video: {
      width: '100%',
      maxWidth: 'calc(100% - 32px)',
      maxHeight: 'calc(100% - 100px)',
      borderRadius: 8,
      border: '2px solid #e5e7eb',
      backgroundColor: '#000',
      objectFit: 'cover' as const,
      marginBottom: 16,
    },
    webcamControls: {
      display: 'flex',
      gap: 16,
      marginTop: 16,
      width: '100%',
      justifyContent: 'center',
      padding: '0 19.2px',
    },
    photoSection: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    errorMessage: {
      color: mergedConfig.secondaryColor,
      fontFamily: mergedConfig.fontFamily,
      fontSize: 14,
      textAlign: 'center' as const,
      marginTop: 16,
      padding: '0 19.2px',
    },
    previewSection: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 19.2,
      gap: 16,
      flex: 1,
    },
    photoPreview: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: 200,
      height: 'auto',
      aspectRatio: '1 / 1',
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      marginBottom: 16,
    },
    previewImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
    },
    previewInfo: {
      textAlign: 'center' as const,
      position: 'absolute' as const,
      bottom: 0,
      width: '100%',
      background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
      color: 'white',
      padding: '16px 8px 8px 8px',
    },
    previewText: {
      margin: 0,
      fontSize: 14,
      fontWeight: 500,
      color: mergedConfig.textColor,
      fontFamily: mergedConfig.fontFamily,
    },
    previewSubtext: {
      margin: 0,
      fontSize: 12,
      color: mergedConfig.secondaryColor,
      fontFamily: mergedConfig.fontFamily,
    },
    previewActions: {
      display: 'flex',
      gap: 16,
      width: '100%',
      justifyContent: 'center',
      padding: '0 19.2px 12px 19.2px',
      flexWrap: 'wrap' as const,
    },
    processingSection: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: 19.2,
    },
    processingText: {
      marginTop: 9.6,
      fontSize: 16,
      color: mergedConfig.textColor,
      fontFamily: mergedConfig.fontFamily,
      textAlign: 'center' as const,
    },
    processingSubtext: {
      fontSize: 13,
      color: mergedConfig.secondaryColor,
      fontFamily: mergedConfig.fontFamily,
      textAlign: 'center' as const,
      marginTop: 6.4,
    },
    resultSection: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 19.2,
      gap: 16,
      flex: 1,
    },
    resultImage: {
      width: '100%',
      maxWidth: 300,
      height: 'auto',
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      objectFit: 'contain' as const,
      marginBottom: 16,
    },
    resultActions: {
      display: 'flex',
      gap: 16,
      width: '100%',
      justifyContent: 'center',
      padding: '0 19.2px 12px 19.2px',
      flexWrap: 'wrap' as const,
    },
  };

  // Load product details
  useEffect(() => {
    if (previewMode) {
      setProduct({
        id: 'demo-product',
        name: config.title || 'Sample Product',
        price: 99.99,
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop'],
        category: 'Clothing',
      });
      setStep('product');
    } else {
      const loadProduct = async () => {
        try {
          const response = await fetch(`${BASE_API_URL}/api/product/by-api-key?api_key=${encodeURIComponent(apiKey)}&product_id=${encodeURIComponent(productId)}`);
          if (!response.ok) {
            throw new Error('Failed to load product');
          }
          const productData = await response.json();
          // Process image URLs to make them absolute
          if (productData.images && productData.images.length > 0) {
            productData.images = productData.images.map((img: string) => {
              // If it's already a full URL (starts with http/https), use as-is
              if (img.startsWith('http://') || img.startsWith('https://')) {
                return img;
              }
              // Otherwise, prepend the API base URL for local images
              const cleanImg = img.startsWith('/') ? img.substring(1) : img;
              return `${BASE_API_URL}/api/${cleanImg}`;
            });
          }
          setProduct(productData);
          setStep('product');
        } catch (err) {
          setError('Failed to load product details');
          setStep('product');
        }
      };
      loadProduct();
    }
  }, [apiKey, productId, previewMode, config]);

  // Track widget opened on mount
  useEffect(() => {
    trackEvent(WidgetAnalyticsEvents.WIDGET_OPENED, { productId, previewMode, apiKey });
  }, []);

  // Track product viewed when product is loaded
  useEffect(() => {
    if (product) {
      trackEvent(WidgetAnalyticsEvents.PRODUCT_VIEWED, { productId: product.id, name: product.name, apiKey });
    }
  }, [product]);

  // Clean up camera when step changes away from photo
  useEffect(() => {
    if (step !== 'photo' && isWebcamActive) {
      stopWebcam();
    }
  }, [step, isWebcamActive]);

  // Clean up camera when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (isWebcamActive) {
        stopWebcam();
      }
    };
  }, [isWebcamActive]);

  // Additional cleanup when navigating back from photo to product
  useEffect(() => {
    if (step === 'product' && isWebcamActive) {
      stopWebcam();
    }
  }, [step, isWebcamActive]);

  // Handle modal close with camera cleanup
  const handleClose = () => {
    if (isWebcamActive) {
      stopWebcam();
    }
    trackEvent(WidgetAnalyticsEvents.WIDGET_CLOSED, { productId: product?.id, apiKey });
    onClose?.();
  };

  // Webcam handling
  const startWebcam = async () => {
    trackEvent(WidgetAnalyticsEvents.PHOTO_CAPTURE_STARTED, { productId: product?.id, apiKey });
    if (!videoRef.current) {
      setError('Video element not found');
      return;
    }
    console.log('Starting webcam...');
    console.log('navigator.mediaDevices available:', !!navigator.mediaDevices);
    console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);

    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        throw new Error('Camera access requires a secure context (HTTPS or localhost)');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('Webcam stream obtained:', stream);
      console.log('Stream tracks:', stream.getTracks());

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded, playing video...');
          videoRef.current?.play().then(() => {
            console.log('Video play promise resolved');
            setIsWebcamActive(true);
          }).catch((playError) => {
            console.error('Video play error:', playError);
            setError('Video playback failed: ' + playError.message);
          });
        };

        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setError('Video playback error');
        };

        videoRef.current.oncanplay = () => {
          console.log('Video can play');
        };

        videoRef.current.onplaying = () => {
          console.log('Video is playing');
        };
      } else {
        console.error('Video ref not available');
        setError('Video element not found');
      }
    } catch (err) {
      console.error('Webcam error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('Unable to access camera: ' + errorMessage);

      // Reset the flag so user can try again
      webcamStartedRef.current = false;
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsWebcamActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setPhoto(photoData);
        stopWebcam();
        setStep('preview');
        trackEvent(WidgetAnalyticsEvents.PHOTO_CAPTURED, { productId: product?.id, apiKey });
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    trackEvent(WidgetAnalyticsEvents.PHOTO_UPLOAD_STARTED, { productId: product?.id, apiKey });
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const photoData = e.target?.result as string;
        setPhoto(photoData);
        setStep('preview');
        trackEvent(WidgetAnalyticsEvents.PHOTO_UPLOADED, { productId: product?.id, apiKey });
      };
      reader.readAsDataURL(file);
    }
  };

  const processTryOn = async (photoData: string) => {
    trackEvent(WidgetAnalyticsEvents.TRYON_GENERATION_STARTED, { productId: product?.id, apiKey });
    setIsGenerating(true);
    setError(null);
    setShowLongWaitTip(false);

    // Show a tip if waiting more than 5 seconds
    const tipTimeout = setTimeout(() => setShowLongWaitTip(true), 5000);

    try {
      const response = await fetch(`${BASE_API_URL}/api/generate-virtual-try-on-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
        body: JSON.stringify({
          productId,
          photo: photoData,
          timestamp: new Date().toISOString()
        })
      });

      clearTimeout(tipTimeout);

      if (!response.ok) {
        throw new Error('Virtual try-on generation failed');
      }

      const resultData = await response.json();
      setResult(resultData.resultImage || resultData.image);
      setStep('result');
      onTryOnComplete?.(resultData);
      trackEvent(WidgetAnalyticsEvents.TRYON_GENERATION_SUCCESS, { productId: product?.id, apiKey });
    } catch (err) {
      setError('Failed to generate virtual try-on image');
      setStep('preview');
      trackEvent(WidgetAnalyticsEvents.TRYON_GENERATION_FAILED, { productId: product?.id, error: err instanceof Error ? err.message : String(err), apiKey });
    } finally {
      setIsGenerating(false);
      clearTimeout(tipTimeout);
      setShowLongWaitTip(false);
    }
  };

  const resetWidget = () => {
    trackEvent(WidgetAnalyticsEvents.TRY_AGAIN_CLICKED, { productId: product?.id, apiKey });
    setPhoto(null);
    setResult(null);
    setError(null);
    setIsGenerating(false);
    webcamStartedRef.current = false;
    if (isWebcamActive) {
      stopWebcam();
    }
    setStep('photo');
  };

  // Track error events globally (optional, for unexpected errors)
  useEffect(() => {
    if (error) {
      trackEvent(WidgetAnalyticsEvents.ERROR_EVENT, { productId: product?.id, error, apiKey });
    }
  }, [error]);

  const renderLoading = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step !== 'loading' && (
            <button
              onClick={() => setStep('loading')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: mergedConfig.textColor,
                padding: 4,
                borderRadius: 4,
                marginRight: 8,
              }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h3 style={titleStyle}>
            {mergedConfig.title || 'Virtual Try-On'}
          </h3>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: mergedConfig.textColor,
            padding: 4,
            borderRadius: 4,
            marginLeft: 8,
          }}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
      <div style={{ ...styles.loadingContainer, flex: 1 }}>
      <div style={styles.spinner}></div>
        <p style={{ ...styles.loadingText, color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily }}>Loading product...</p>
      </div>
    </div>
  );

  const renderProduct = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step !== 'product' && (
            <button
              onClick={() => setStep('product')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: mergedConfig.textColor,
                padding: 4,
                borderRadius: 4,
                marginRight: 8,
              }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h3 style={titleStyle}>
            {mergedConfig.title || 'Virtual Try-On'}
          </h3>
        </div>
        {!previewMode && (
          <button
            type="button"
            onClick={handleClose}
            style={{ ...secondaryButtonStyle, marginBottom: 0, padding: 8, fontSize: 18, borderRadius: 24 }}
          >
            ×
          </button>
        )}
      </div>
      {product && (
        <div style={{
          display: 'flex' as const,
          flexDirection: 'column' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          padding: 19.2,
          gap: 9.6,
          flex: 1
        }}>
          <div style={{ ...styles.productImage, margin: '0 auto' }}>
            <img
              src={product.images[0]}
              alt={product.name}
              style={styles.image}
            />
          </div>
          <div style={{ ...styles.productInfo, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h4 style={{ ...styles.productName, color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily, textAlign: 'center' }}>{product.name}</h4>
            <p style={{ ...styles.productPrice, color: mergedConfig.primaryColor, textAlign: 'center', margin: 0 }}>{`$${product.price.toFixed(2)}`}</p>
            <p style={{ ...styles.productCategory, color: mergedConfig.secondaryColor, textAlign: 'center', margin: 0 }}>{product.category}</p>
          </div>
        </div>
      )}
      <div style={{ ...styles.actionSection, padding: '0 19.2px 12px 19.2px' }}>
        <div style={{ color: mergedConfig.textColor, fontSize: mergedConfig.fontSize, marginBottom: 9.6, textAlign: 'center' as const, fontFamily: mergedConfig.fontFamily }}>
          {mergedConfig.subtitle || 'Experience this product on yourself with our AI-powered virtual try-on.'}
          <br />
          <span style={{ color: mergedConfig.secondaryColor, fontSize: 12, fontWeight: 400 }}>
            Your photo is processed securely and never stored.
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Take Photo button clicked, previewMode:', previewMode);
            setStep('photo');
          }}
          style={{ ...primaryButtonStyle, marginBottom: 12 }}
          disabled={previewMode}
        >
          {mergedConfig.buttonText || 'Take a Photo'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Upload Photo button clicked, previewMode:', previewMode);
            fileInputRef.current?.click();
          }}
          style={{ ...secondaryButtonStyle }}
          disabled={previewMode}
        >
          <span role="img" aria-label="upload" style={{ marginRight: 6.4 }}>📁</span>
          {mergedConfig.uploadButtonText || 'Upload a Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );

  const handleVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (
      node &&
      step === 'photo' &&
      !isWebcamActive &&
      !webcamStartedRef.current
    ) {
      webcamStartedRef.current = true;
      startWebcam();
    }
  };

  const renderPhoto = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Show back arrow in photo step to return to product step */}
          <button
            onClick={() => setStep('product')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: mergedConfig.textColor,
              padding: 4,
              borderRadius: 4,
              marginRight: 8,
            }}
            aria-label="Go back"
          >
            ←
          </button>
          <h3 style={titleStyle}>
            Take a Photo
          </h3>
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{ ...secondaryButtonStyle, marginBottom: 0, padding: 8, fontSize: 18, borderRadius: 24 }}
        >
          ×
        </button>
      </div>
      <div style={{ ...styles.photoSection, flex: 1 }}>
        <div style={styles.webcamSection}>
          <div style={{ margin: '0 0 16px 0', color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily, fontSize: 14, textAlign: 'center' }}>
            Please allow camera access to take a photo, or upload a photo from your device.<br/>
          </div>
          <video
            ref={handleVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              ...styles.video,
              display: isWebcamActive ? 'block' : 'none',
              borderColor: '#e5e7eb'
            }}
            onLoadStart={() => console.log('Video load started')}
            onCanPlay={() => console.log('Video can play')}
            onPlaying={() => console.log('Video is playing')}
            onError={(e) => console.error('Video element error:', e)}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          {!isWebcamActive && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={{ ...styles.loadingText, color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily }}>Starting camera...</p>
            {!window.isSecureContext ? (
              <div style={styles.errorMessage}>
                  <p style={{ margin: '0 0 6.4px 0', fontWeight: 600, color: mergedConfig.primaryColor, fontFamily: mergedConfig.fontFamily }}>⚠️ Camera Access Issue</p>
                  <p style={{ margin: 0, fontSize: '11.2px', color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily }}>
                  Camera access requires a secure connection. Please serve this page over HTTPS or localhost.
                </p>
                  <p style={{ margin: '6.4px 0 0 0', fontSize: '9.6px', color: mergedConfig.secondaryColor, fontFamily: mergedConfig.fontFamily }}>
                  Current URL: {window.location.protocol}//{window.location.host}
                </p>
              </div>
              ) : null}
            <button
              type="button"
              onClick={() => {
                console.log('Manual webcam start clicked');
                webcamStartedRef.current = false;
                startWebcam();
              }}
                style={{ ...primaryButtonStyle }}
              disabled={!window.isSecureContext}
            >
              📷 Start Camera Manually
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
                style={{ ...secondaryButtonStyle }}
            >
              📁 Upload Photo Instead
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
          )}
          {isWebcamActive && (
            <div style={styles.webcamControls}>
              <button type="button" onClick={capturePhoto} style={{ ...primaryButtonStyle }}>
                📸 Capture
              </button>
              <button type="button" onClick={stopWebcam} style={{ ...secondaryButtonStyle }}>
                Cancel
              </button>
          </div>
        )}
      </div>
      </div>
      {error && (
        <div style={{ ...styles.errorMessage, color: mergedConfig.secondaryColor, fontFamily: mergedConfig.fontFamily }}>
          {error}
        </div>
      )}
    </div>
  );

  const renderPreview = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Always show back arrow in preview step to return to photo step */}
          <button
            onClick={() => setStep('photo')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: mergedConfig.textColor,
              padding: 4,
              borderRadius: 4,
              marginRight: 8,
            }}
            aria-label="Go back"
          >
            ←
          </button>
          <h3 style={titleStyle}>
            Preview Your Photo
          </h3>
      </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: mergedConfig.textColor,
            padding: 4,
            borderRadius: 4,
            marginLeft: 8,
          }}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
      <div style={{ margin: '16px 0', color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily, fontSize: 14, textAlign: 'center' }}>
        Review your photo before generating your virtual try-on.
      </div>
      <div style={{ ...styles.previewSection, flex: 1 }}>
        {photo && (
          <div style={styles.photoPreview}>
            <img src={photo} alt="Your photo" style={styles.previewImage} />

          </div>
        )}
        <div style={styles.previewActions}>
          <button
            type="button"
            onClick={() => setStep('photo')}
            style={{ ...secondaryButtonStyle }}
          >
            ← Take Another Photo
          </button>
          <button
            type="button"
            onClick={() => processTryOn(photo!)}
            style={{ ...primaryButtonStyle }}
            disabled={!photo || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Virtual Try-On'}
          </button>
        </div>
      </div>
      {error && (
        <div style={{ ...styles.errorMessage, color: mergedConfig.secondaryColor, fontFamily: mergedConfig.fontFamily }}>
          {error}
        </div>
      )}
    </div>
  );

  const renderProcessing = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step !== 'processing' && (
            <button
              onClick={() => setStep('processing')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: mergedConfig.textColor,
                padding: 4,
                borderRadius: 4,
                marginRight: 8,
              }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h3 style={titleStyle}>
            Generating Virtual Try-On
          </h3>
      </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: mergedConfig.textColor,
            padding: 4,
            borderRadius: 4,
            marginLeft: 8,
          }}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>
      <div style={{ margin: '16px 0', color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily, fontSize: 14, textAlign: 'center' }}>
        Please wait while we generate your virtual try-on image. This may take a few moments.
      </div>
      <div style={{ ...styles.processingSection, flex: 1 }}>
        <div style={styles.spinner}></div>
        <p style={{ ...styles.processingText, color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily }}>Creating your virtual try-on image...</p>
        <p style={{ ...styles.processingSubtext, color: mergedConfig.secondaryColor, fontFamily: mergedConfig.fontFamily }}>This may take a few moments</p>
        {showLongWaitTip && (
          <div style={{ marginTop: 18, color: mergedConfig.textColor, fontSize: 13, textAlign: 'center' }}>
            <b>Style Tip:</b> Confidence is the best outfit!<br />Thank you for your patience.
          </div>
        )}
      </div>
    </div>
  );

  const renderResult = () => (
    <div style={modalStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step !== 'result' && (
            <button
              onClick={() => setStep('result')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: mergedConfig.textColor,
                padding: 4,
                borderRadius: 4,
                marginRight: 8,
              }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h3 style={titleStyle}>
            Your Try-On Result
          </h3>
        </div>
        <button
          type="button"
          onClick={handleClose}
          style={{ ...secondaryButtonStyle, marginBottom: 0, padding: 8, fontSize: 18, borderRadius: 24 }}
        >
          ×
        </button>
      </div>
      <div style={{ margin: '16px 0', color: mergedConfig.textColor, fontFamily: mergedConfig.fontFamily, fontSize: 14, textAlign: 'center' }}>
        Here is your virtual try-on result! You can try again or close the widget.
      </div>
      <div style={{ ...styles.resultSection, flex: 1 }}>
        {result && (
          <img src={result} alt="Virtual try-on result" style={styles.resultImage} />
        )}
        <div style={styles.resultActions}>
          <button type="button" onClick={resetWidget} style={{ ...primaryButtonStyle }}>
            Try Again
          </button>
          <button type="button" onClick={handleClose} style={{ ...secondaryButtonStyle }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 'loading': return renderLoading();
      case 'product': return renderProduct();
      case 'photo': return renderPhoto();
      case 'preview': return renderPreview();
      case 'processing': return renderProcessing();
      case 'result': return renderResult();
      default: return renderLoading();
    }
  };

  if (previewMode) {
    return (
      <div style={modalStyle}>
        {renderStep()}
        {mergedConfig.showBranding && (
          <div style={poweredByStyle}>
            Powered by virtualFit
          </div>
        )}
      </div>
    );
  }
  return (
    <div style={{ ...styles.overlay, fontFamily: mergedConfig.fontFamily }}>
      <div style={modalStyle}>
        {renderStep()}
        {mergedConfig.showBranding && (
          <div style={poweredByStyle}>
            Powered by virtualFit
          </div>
        )}
      </div>
    </div>
  );
};

// Add a helper function to convert hex to rgba
function hexToRgba(hex: string, alpha: number) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return `rgba(${r},${g},${b},${alpha})`;
}

export default VirtualTryOnWidget;
