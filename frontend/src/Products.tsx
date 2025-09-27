import React, { useState, useMemo } from 'react';
import ImportWizardModal from './ImportWizardModal';
import { api, API_CONFIG } from './config/apiConfig';
import { useAuth } from './AuthContext';

// Product type
type Product = {
  id: string; // UUID4 string
  name: string; // Required
  sku: string; // Required unique identifier
  price?: number; // Optional
  page_url?: string; // Optional
  category?: string; // Optional
  images: string[]; // Required
};

const PAGE_SIZE = 5;

// SVG icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.85 2.85a2.121 2.121 0 0 1 3 3l-9.5 9.5a1 1 0 0 1-.42.25l-3.5 1a1 1 0 0 1-1.23-1.23l1-3.5a1 1 0 0 1 .25-.42l9.5-9.5Zm2.12.88a1.121 1.121 0 0 0-1.59 0l-9.5 9.5-1 3.5 3.5-1 9.5-9.5a1.121 1.121 0 0 0 0-1.59Z" fill="currentColor"/></svg>
);
const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V3h4a1 1 0 1 1 0 2h-1.09l-.82 11.48A2 2 0 0 1 12.6 18H7.4a2 2 0 0 1-1.99-1.52L4.59 5H3.5a1 1 0 1 1 0-2h4V2Zm1 1v1h3V3h-3Zm-2.91 2l.8 11.2a1 1 0 0 0 1 .8h5.2a1 1 0 0 0 1-.8L15.41 5H4.59Z" fill="currentColor"/></svg>
);

const Products: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [selectedImportMethod, setSelectedImportMethod] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered and paginated products
  const filtered = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);
  const paginated = useMemo(() =>
    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  // Add/Edit product
  const handleSave = async (product: Omit<Product, 'id'>) => {
    if (editing) {
      setProducts(ps => ps.map(p => p.id === editing.id ? { ...editing, ...product } : p));
      setModalOpen(false);
      setEditing(null);
    } else {
      // For new products, the modal handles the API call
      // Just refresh the product list
      await fetchProducts();
      setModalOpen(false);
      setEditing(null);
    }
  };

  // Fetch products from backend
  const fetchProducts = async () => {
    try {
      const res = await api.getProducts(token || undefined);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  // Fetch products from backend on mount and when token changes
  React.useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  // Delete product
  const handleDelete = async () => {
    if (deleteId !== null) {
      setIsDeleting(true);
      try {
        const res = await api.deleteProduct(deleteId, token || undefined);
        if (!res.ok) {
          const data = await res.json();
          alert(data.detail || 'Failed to delete product');
          return;
        }
        // Remove from local state
        setProducts(ps => ps.filter(p => p.id !== deleteId));
        setDeleteId(null);
      } catch (err) {
        alert('Network error. Could not delete product.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // CSV import (UI only)
  const handleCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines[0].toLowerCase().includes('name') || !lines[0].toLowerCase().includes('sku')) {
        setCsvError('CSV must have headers: name,sku,price');
        return;
      }
      const newProducts: Product[] = [];
      for (let i = 1; i < lines.length; i++) {
        const [name, sku, price] = lines[i].split(',');
        if (!name || !sku || isNaN(Number(price))) continue;
        newProducts.push({
          id: Math.random().toString(),
          name,
          sku,
          price: Number(price),
          images: []
        });
      }
      setProducts(ps => [...ps, ...newProducts]);
      setCsvError(null);
    };
    reader.readAsText(file);
  };

  const getImageUrl = (url: string) => {
    // Filter out blob URLs and invalid URLs
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return ''; // Return empty string for invalid URLs
    }
    return url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
  };

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '25.6px',
        minHeight: 'calc(100vh - 56px)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 1400,
          padding: 25.6,
          marginTop: 6.4,
        }}>
          <div style={{ textAlign: 'left', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 24, color: 'white', letterSpacing: 0.8, margin: 0, fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>Product Catalogue</h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9.6 }}>
              <button
                className="btn-secondary"
                style={{ marginRight: 6.4 }}
                onClick={() => setImportModalOpen(true)}
              >
                📥 Bulk Import
              </button>
              <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Add Product</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 25.6 }}>
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: 304,
                padding: '0.8rem 1.2rem',
                borderRadius: 12.8,
                border: '1.2px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14.4,
                outline: 'none',
                marginRight: 12.8,
                boxShadow: '0 1.6px 6.4px 0 rgba(31, 38, 135, 0.10)',
                backdropFilter: 'blur(6.4px)',
              }}
            />
            {csvError && <span style={{ color: '#ff6b6b', marginLeft: 9.6 }}>{csvError}</span>}
            <div style={{ flex: 1 }} />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              background: 'rgba(255,255,255,0.10)',
              borderRadius: 19.2,
              boxShadow: '0 1.6px 6.4px 0 rgba(31, 38, 135, 0.10)',
              border: '1.2px solid rgba(255,255,255,0.18)',
              padding: 3.2,
              marginRight: 12.8,
            }}>
                              <button
                  style={{
                    borderRadius: 16,
                    padding: '6.4px 16px',
                    fontWeight: 600,
                    fontSize: 12.8,
                    background: viewMode === 'table' ? 'var(--accent-gradient)' : 'transparent',
                    color: viewMode === 'table' ? 'white' : '#bfcfff',
                    border: 'none',
                    boxShadow: viewMode === 'table' ? '0 1.6px 6.4px #ff6b6b33' : undefined,
                    cursor: 'pointer',
                    transform: 'none',
                    transition: 'none',
                  }}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  <span style={{ verticalAlign: 'middle', marginRight: 6.4 }}>📋</span>Table
                </button>
                <button
                  style={{
                    borderRadius: 16,
                    padding: '6.4px 16px',
                    fontWeight: 600,
                    fontSize: 12.8,
                    background: viewMode === 'card' ? 'var(--accent-gradient)' : 'transparent',
                    color: viewMode === 'card' ? 'white' : '#bfcfff',
                    border: 'none',
                    boxShadow: viewMode === 'card' ? '0 1.6px 6.4px #ff6b6b33' : undefined,
                    cursor: 'pointer',
                    transform: 'none',
                    transition: 'none',
                  }}
                  onClick={() => setViewMode('card')}
                  title="Card View"
                >
                  <span style={{ verticalAlign: 'middle', marginRight: 6.4 }}>🗂️</span>Cards
                </button>
            </div>
          </div>
          <div style={{ marginBottom: 19.2 }}>
            {/* Product list: table or card view */}
            {viewMode === 'table' ? (
              <div style={{
                background: 'rgba(255,255,255,0.10)',
                borderRadius: 19.2,
                boxShadow: '0 6.4px 25.6px 0 rgba(31, 38, 135, 0.18)',
                border: '2px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(19.2px)',
                padding: '1.6rem',
                color: 'white',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ fontWeight: 600, fontSize: 16, color: '#bfcfff', textAlign: 'left' }}>
                      <th style={{ padding: '12.8px 9.6px' }}>Image</th>
                      <th style={{ padding: '12.8px 9.6px' }}>Name</th>
                      <th style={{ padding: '12.8px 9.6px' }}>SKU</th>
                      <th style={{ padding: '12.8px 9.6px' }}>Category</th>
                      <th style={{ padding: '12.8px 9.6px' }}>Price</th>
                      <th style={{ padding: '12.8px 9.6px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 25.6, color: '#bfcfff' }}>No products found.</td></tr>
                    )}
                    {paginated.map(product => (
                      <tr key={product.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: 12.8 }}>
                        <td style={{ padding: '12.8px 9.6px' }}>
                          {product.images && product.images.length > 0 && getImageUrl(product.images[0]) ? (
                            <img
                              src={getImageUrl(product.images[0])}
                              alt="thumb"
                              style={{ width: 44.8, height: 44.8, objectFit: 'cover', borderRadius: 6.4, border: '1.2px solid #fff', cursor: 'pointer' }}
                              onClick={() => {
                                const validImages = product.images.map(getImageUrl).filter(url => url);
                                if (validImages.length > 0) {
                                  setGalleryImages(validImages);
                                  setGalleryIndex(0);
                                  setGalleryOpen(true);
                                }
                              }}
                            />
                          ) : (
                            <div style={{ width: 44.8, height: 44.8, borderRadius: 6.4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfcfff', fontSize: 19.2, fontWeight: 700 }}>?</div>
                          )}
                        </td>
                        <td style={{ padding: '12.8px 9.6px' }}>{product.name}</td>
                        <td style={{ padding: '12.8px 9.6px' }}>{product.sku}</td>
                        <td style={{ padding: '12.8px 9.6px' }}>{product.category || 'N/A'}</td>
                        <td style={{ padding: '12.8px 9.6px' }}>${product.price?.toFixed(2) || 'N/A'}</td>
                        <td style={{ padding: '12.8px 9.6px', display: 'flex', gap: 6.4 }}>
                          <button
                            onClick={() => { setEditing(product); setModalOpen(true); }}
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: 6.4,
                              padding: '4.8px',
                              color: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => setDeleteId(product.id)}
                            style={{
                              background: 'rgba(255,107,107,0.2)',
                              border: '1px solid rgba(255,107,107,0.3)',
                              borderRadius: 6.4,
                              padding: '4.8px',
                              color: '#ff6b6b',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            title="Delete"
                          >
                            <DeleteIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(256px, 1fr))',
                gap: 25.6,
              }}>
                {paginated.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 25.6, color: '#bfcfff' }}>No products found.</div>
                )}
                {paginated.map(product => (
                  <div key={product.id} style={{
                    background: 'rgba(255,255,255,0.10)',
                    borderRadius: 19.2,
                    boxShadow: '0 6.4px 25.6px 0 rgba(31, 38, 135, 0.18)',
                    border: '2px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(19.2px)',
                    padding: '1.2rem',
                    color: 'white',
                    transition: 'all 0.3s ease',
                  }}>
                    <div style={{ marginBottom: 12.8 }}>
                      {product.images && product.images.length > 0 && getImageUrl(product.images[0]) ? (
                        <img
                          src={getImageUrl(product.images[0])}
                          alt={product.name}
                          style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 12.8, border: '1.2px solid #fff', cursor: 'pointer' }}
                          onClick={() => {
                            const validImages = product.images.map(getImageUrl).filter(url => url);
                            if (validImages.length > 0) {
                              setGalleryImages(validImages);
                              setGalleryIndex(0);
                              setGalleryOpen(true);
                            }
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: 160, borderRadius: 12.8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfcfff', fontSize: 38.4, fontWeight: 700 }}>?</div>
                      )}
                    </div>
                    <h3 style={{ fontWeight: 600, fontSize: 14.4, marginBottom: 6.4 }}>{product.name}</h3>
                    <p style={{ color: '#bfcfff', fontSize: 11.2, marginBottom: 6.4 }}>SKU: {product.sku}</p>
                    {product.category && (
                      <p style={{ color: '#bfcfff', fontSize: 11.2, marginBottom: 6.4 }}>Category: {product.category}</p>
                    )}
                    <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 12.8 }}>${product.price?.toFixed(2) || 'N/A'}</p>
                    <div style={{ display: 'flex', gap: 6.4 }}>
                      <button
                        onClick={() => { setEditing(product); setModalOpen(true); }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6.4,
                          padding: '6.4px 12.8px',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: 11.2,
                          fontWeight: 600,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(product.id)}
                        style={{
                          background: 'rgba(255,107,107,0.2)',
                          border: '1px solid rgba(255,107,107,0.3)',
                          borderRadius: 6.4,
                          padding: '6.4px 12.8px',
                          color: '#ff6b6b',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          fontSize: 11.2,
                          fontWeight: 600,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6.4, marginTop: 25.6 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  background: page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 9.6,
                  padding: '6.4px 12.8px',
                  color: page === 1 ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: 11.2,
                  fontWeight: 600,
                }}
              >
                Previous
              </button>
              <span style={{ color: '#bfcfff', fontSize: 11.2, fontWeight: 600 }}>
                Page {page} of {pageCount}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                style={{
                  background: page === pageCount ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 9.6,
                  padding: '6.4px 12.8px',
                  color: page === pageCount ? 'rgba(255,255,255,0.3)' : 'white',
                  cursor: page === pageCount ? 'not-allowed' : 'pointer',
                  fontSize: 11.2,
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <ProductModal
          product={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={handleSave}
          onRefresh={fetchProducts}
        />
      )}

      {deleteId !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(10,10,10,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(30,32,44,0.98)',
            borderRadius: 19.2,
            padding: '1.6rem',
            color: 'white',
            boxShadow: '0 6.4px 25.6px 0 rgba(31, 38, 135, 0.18)',
            border: '2px solid rgba(255,255,255,0.18)',
            maxWidth: 320,
          }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12.8 }}>Delete Product</h3>
            <p style={{ color: '#bfcfff', marginBottom: 19.2 }}>Are you sure you want to delete this product? This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9.6 }}>
              <button className="btn-secondary" onClick={() => setDeleteId(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn-primary" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {galleryOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(10,10,10,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <button
            onClick={() => setGalleryOpen(false)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer', fontWeight: 700, fontSize: 16
            }}
          >
            ×
          </button>
          {galleryImages.length > 0 && (
            <>
              <img
                src={galleryImages[galleryIndex]}
                alt="gallery"
                style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
              />
              {galleryImages.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIndex(i => i === 0 ? galleryImages.length - 1 : i - 1)}
                    style={{
                      position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%',
                      width: 40, height: 40, cursor: 'pointer', fontSize: 19.2, fontWeight: 700
                    }}
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setGalleryIndex(i => i === galleryImages.length - 1 ? 0 : i + 1)}
                    style={{
                      position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                      background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%',
                      width: 40, height: 40, cursor: 'pointer', fontSize: 19.2, fontWeight: 700
                    }}
                  >
                    ›
                  </button>
                  <div style={{
                    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                    color: 'white', fontSize: 12.8, fontWeight: 600
                  }}>
                    {galleryIndex + 1} / {galleryImages.length}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Import Wizard Modal */}
      <ImportWizardModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportStep(1);
          setSelectedImportMethod('');
        }}
        step={importStep}
        setStep={setImportStep}
        selectedMethod={selectedImportMethod}
        setSelectedMethod={setSelectedImportMethod}
      />
    </>
  );
};

// Modal for Add/Edit Product
const ProductModal: React.FC<{
  product: Product | null;
  onClose: () => void;
  onSave: (p: Omit<Product, 'id'>) => void;
  onRefresh?: () => Promise<void>;
}> = ({ product, onClose, onSave, onRefresh }) => {
  const { token } = useAuth();
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [page_url, setPageUrl] = useState(product?.page_url || '');
  const [category, setCategory] = useState(product?.category || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Track existing images (URLs) and new files separately
  const [existingImages, setExistingImages] = useState<string[]>(product?.images || []);
  const [previewUrls, setPreviewUrls] = useState<string[]>(product?.images || []);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArr = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArr]);

    // Create preview URLs for selected files (blobs)
    const newPreviewUrls = fileArr.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const handleRemoveImage = (idx: number) => {
    // Determine if this is an existing image or a new file
    const isExistingImage = idx < existingImages.length;

    if (isExistingImage) {
      // Remove from existing images
      setExistingImages(prev => prev.filter((_, i) => i !== idx));
    } else {
      // Remove from selected files (adjust index for new files)
      const fileIndex = idx - existingImages.length;
      setSelectedFiles(prev => prev.filter((_, i) => i !== fileIndex));
    }

    // Remove from preview URLs
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || (!product && selectedFiles.length === 0)) {
      setError('Product Name, SKU, and at least one image are required.');
      return;
    }

    // For edit mode, check if we have at least one image (existing or new)
    if (product && existingImages.length === 0 && selectedFiles.length === 0) {
      setError('Product Name, SKU, and at least one image are required.');
      return;
    }
    const productData = {
      name: name.trim(),
      sku: sku.trim(),
      price: price ? Number(price) : undefined,
      page_url: page_url.trim() || undefined,
      category: category.trim() || undefined,
    };
    try {
      let res;
      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('sku', productData.sku);
      if (productData.price) formData.append('price', productData.price.toString());
      if (productData.page_url) formData.append('page_url', productData.page_url);
      if (productData.category) formData.append('category', productData.category);

      // Add new files
      selectedFiles.forEach((file) => {
        formData.append('images', file);
      });

      // Add existing image URLs for edit mode
      if (product && existingImages.length > 0) {
        formData.append('existing_images', JSON.stringify(existingImages));
      }

      if (product) {
        // Edit mode: use PUT endpoint
        res = await fetch(`${API_CONFIG.BASE_URL}/products/${product.id}`, {
          method: 'PUT',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
      } else {
        // Add mode: use add endpoint
        res = await api.addProductWithImages(productData, selectedFiles, token || undefined);
      }
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || (product ? 'Failed to update product' : 'Failed to add product'));
        return;
      }
      const data = await res.json();

      // For edit mode, we need to refresh the product list to get the updated data
      if (product) {
        // Refresh the product list to get the updated data from backend
        if (onRefresh) {
          await onRefresh();
        }
      } else {
        // For new products, use the preview URLs for immediate display
        onSave({
          ...productData,
          images: previewUrls
        });
      }
      onClose();
    } catch (err) {
      alert(product ? 'Network error. Could not update product.' : 'Network error. Could not add product.');
    }
  };

  const API_BASE = process.env.REACT_APP_BACK_API_URL || '';
  const getImageUrl = (url: string) =>
    url.startsWith('http') || url.startsWith('blob:') ? url : `${API_BASE}/api${url}`;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(10,10,10,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'rgba(30,32,44,0.98)',
        borderRadius: 16,
        padding: '1.6rem',
        color: 'white',
        boxShadow: '0 6.4px 25.6px 0 rgba(31, 38, 135, 0.18)',
        border: '1.6px solid rgba(255,255,255,0.18)',
        width: 400,
        height: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 9.6,
      }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 9.6 }}>{product ? 'Edit Product' : 'Add Product'}</h3>

        <input
          type="text"
          placeholder="Product Name *"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 6.4,
            width: '100%',
          }}
        />

        <input
          type="text"
          placeholder="SKU * (e.g., tshirt-001)"
          value={sku}
          onChange={e => setSku(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 6.4,
            width: '100%',
          }}
        />

        <input
          type="number"
          placeholder="Price (optional)"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 6.4,
            width: '100%',
          }}
        />

        <input
          type="url"
          placeholder="Product Page URL (optional)"
          value={page_url}
          onChange={e => setPageUrl(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 6.4,
            width: '100%',
          }}
        />

        <input
          type="text"
          placeholder="Category (optional)"
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 6.4,
            width: '100%',
          }}
        />

        {/* Image upload */}
        <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 3.2, color: '#ff6b6b' }}>Product Images * (Required)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          style={{
            padding: '0.6rem 0.8rem',
            borderRadius: 8,
            border: '1.2px solid rgba(255,255,255,0.18)',
            background: 'rgba(255,255,255,0.10)',
            color: 'white',
            fontSize: 12,
            outline: 'none',
            marginBottom: 4.8,
            width: '100%',
          }}
        />
        <div style={{ display: 'flex', gap: 6.4, flexWrap: 'wrap', marginBottom: 4.8 }}>
          {previewUrls.length === 0 && <span style={{ color: '#bfcfff', fontSize: 10.4 }}>No images selected.</span>}
          {previewUrls.map((url, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <img src={getImageUrl(url)} alt="preview" style={{ width: 38.4, height: 38.4, objectFit: 'cover', borderRadius: 6.4, border: '1.2px solid #fff' }} />
              <button type="button" onClick={() => handleRemoveImage(idx)} style={{ position: 'absolute', top: -4.8, right: -4.8, background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '50%', width: 14.4, height: 14.4, cursor: 'pointer', fontWeight: 700, fontSize: 9.6, boxShadow: '0 1.6px 4.8px #0003' }}>×</button>
            </div>
          ))}
        </div>
        {error && <span style={{ color: '#ff6b6b', marginBottom: 3.2, fontSize: 10.4 }}>{error}</span>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9.6, marginTop: 'auto' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary">{product ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  );
};

export default Products;
