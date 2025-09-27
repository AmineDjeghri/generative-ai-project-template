import React from 'react';
import VirtualTryOnWidget from './VirtualTryOnWidget';
import type { WidgetConfig } from '../WidgetCustomization';

const product = {
  name: 'Product tshirt-001',
  category: 'clothing',
  image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=facearea&w=256&q=80',
};

interface VirtualTryOnWidgetPreviewProps {
  config?: WidgetConfig;
  onBack?: () => void;
  onClose?: () => void;
}

const VirtualTryOnWidgetPreview: React.FC<VirtualTryOnWidgetPreviewProps> = ({
  config,
  onBack,
  onClose,
}) => (
  <VirtualTryOnWidget config={config} previewMode onClose={onClose} />
);

export default VirtualTryOnWidgetPreview;
