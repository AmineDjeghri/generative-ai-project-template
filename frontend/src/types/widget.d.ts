declare global {
  interface Window {
    VirtualTryOnWidget: {
      init: (config: {
        apiKey: string;
        productId: string;
        position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
        theme?: 'light' | 'dark';
        onTryOnComplete?: (result: any) => void;
        onClose?: () => void;
      }) => any;
      destroy: () => void;
    };
  }
}

export {};
