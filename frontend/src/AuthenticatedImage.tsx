import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from './config/apiConfig';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({
  src,
  alt,
  style,
  onClick
}) => {
  const { token } = useAuth();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadImage = async () => {
      if (!src || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);

        console.log('Loading image:', src, 'with token:', token ? 'present' : 'missing');

        // If it's already a blob URL or data URL, use it directly
        if (src.startsWith('blob:') || src.startsWith('data:')) {
          setImageUrl(src);
          setLoading(false);
          return;
        }

        // If it's a server URL, fetch it with authentication
        // Use the path as-is since backend serves from /artifacts/
        let imagePath = src;

        console.log('Fetching image from path:', imagePath);
        const authenticatedUrl = await api.getAuthenticatedImageUrl(imagePath, token);
        setImageUrl(authenticatedUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup function to revoke blob URL when component unmounts
    return () => {
      if (imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div
        style={{
          ...style,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#bfcfff',
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div
        style={{
          ...style,
          background: 'rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#bfcfff',
          fontSize: 14,
        }}
      >
        Image not found
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      style={style}
      onClick={onClick}
    />
  );
};

export default AuthenticatedImage;
