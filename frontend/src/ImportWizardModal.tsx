import React, { useState } from 'react';
import { getEnabledImportMethods, importConfig } from './config/importConfig';

type ImportWizardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  step: number;
  setStep: (step: number) => void;
  selectedMethod: string;
  setSelectedMethod: (method: string) => void;
};

const ImportWizardModal: React.FC<ImportWizardModalProps> = ({
  isOpen,
  onClose,
  step,
  setStep,
  selectedMethod,
  setSelectedMethod
}) => {
  const importMethods = getEnabledImportMethods();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<{[key: string]: string}>({});
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setFileError(null);

    // Check file size
    if (file.size > importConfig.maxFileSize) {
      setFileError(`File size exceeds maximum allowed size of ${(importConfig.maxFileSize / (1024 * 1024)).toFixed(0)}MB`);
      return;
    }

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !importConfig.supportedFormats.includes(fileExtension)) {
      setFileError(`Unsupported file format. Supported formats: ${importConfig.supportedFormats.map(f => f.toUpperCase()).join(', ')}`);
      return;
    }

    setSelectedFile(file);
  };

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setFileError('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      setCsvHeaders(headers);

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setPreviewData(data.slice(0, 5)); // Show first 5 rows as preview

      // Set up default field mapping
      const defaultMapping: {[key: string]: string} = {};
      const requiredFields = ['product name', 'name', 'sku', 'price', 'page url', 'page_url', 'category', 'image url', 'image_url'];

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (requiredFields.includes(lowerHeader)) {
          // Map common variations
          if (lowerHeader === 'product name' || lowerHeader === 'name') {
            defaultMapping['name'] = header;
          } else if (lowerHeader === 'sku') {
            defaultMapping['sku'] = header;
          } else if (lowerHeader === 'price') {
            defaultMapping['price'] = header;
          } else if (lowerHeader === 'page url' || lowerHeader === 'page_url') {
            defaultMapping['page_url'] = header;
          } else if (lowerHeader === 'category') {
            defaultMapping['category'] = header;
          } else if (lowerHeader === 'image url' || lowerHeader === 'image_url') {
            defaultMapping['image_url'] = header;
          }
        }
      });

      setFieldMapping(defaultMapping);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // For Excel files, we'll send to backend for processing
      // Set placeholder headers and data for now
      const headers = ['Product Name', 'SKU', 'Price', 'Page URL', 'Category', 'Image URL'];
      setCsvHeaders(headers);
      setPreviewData([
        { 'Product Name': 'Sample Product', 'SKU': 'SKU001', 'Price': '19.99', 'Page URL': 'https://example.com', 'Category': 'Clothing', 'Image URL': 'https://example.com/image.jpg' }
      ]);
      setFieldMapping({
        'name': 'Product Name',
        'sku': 'SKU',
        'price': 'Price',
        'page_url': 'Page URL',
        'category': 'Category',
        'image_url': 'Image URL'
      });
    } else {
      setFileError('Unsupported file format. Please upload a CSV or Excel file.');
      return;
    }
  };

  const analyzeFileData = async () => {
    if (!selectedFile || !Object.keys(fieldMapping).length) {
      return;
    }

    setAnalysisLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('field_mapping', JSON.stringify(fieldMapping));

      const apiBaseUrl = process.env.REACT_APP_BACK_API_URL;
      if (!apiBaseUrl) {
        throw new Error('REACT_APP_BACK_API_URL environment variable is not set');
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Making request to:', `${apiBaseUrl}/api/import/analyze-file`);
      console.log('Token:', token.substring(0, 20) + '...');
      console.log('Field mapping:', fieldMapping);

      const response = await fetch(`${apiBaseUrl}/api/import/analyze-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisData(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to analyze file data:', response.status, errorText);
        throw new Error(`Failed to analyze file data: ${response.status}`);
      }
    } catch (error) {
      console.error('Error analyzing file data:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to analyze file data');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const executeImport = async () => {
    if (!selectedFile || !Object.keys(fieldMapping).length) {
      return;
    }

    setAnalysisLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('field_mapping', JSON.stringify(fieldMapping));

      const apiBaseUrl = process.env.REACT_APP_BACK_API_URL;
      if (!apiBaseUrl) {
        throw new Error('REACT_APP_BACK_API_URL environment variable is not set');
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Executing import to:', `${apiBaseUrl}/api/import/execute`);

      const response = await fetch(`${apiBaseUrl}/api/import/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Import result:', data);
        // Close modal and refresh products list
        onClose();
        // You might want to trigger a refresh of the products list here
        window.location.reload(); // Simple refresh for now
      } else {
        const errorText = await response.text();
        console.error('Failed to execute import:', response.status, errorText);
        throw new Error(`Failed to execute import: ${response.status}`);
      }
    } catch (error) {
      console.error('Error executing import:', error);
      setFileError(error instanceof Error ? error.message : 'Failed to execute import');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Choose Import Method</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
        marginBottom: 32
      }}>
        {importMethods.map(method => (
          <div
            key={method.id}
            onClick={() => setSelectedMethod(method.id)}
            style={{
              background: selectedMethod === method.id ? method.color : 'rgba(255,255,255,0.05)',
              borderRadius: 20,
              padding: 24,
              border: selectedMethod === method.id ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.18)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 180,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 40, marginBottom: 16 }}>{method.icon}</div>
              <h4 style={{ fontWeight: 600, fontSize: 20, marginBottom: 8, color: 'white' }}>{method.name}</h4>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.4 }}>{method.description}</p>
            </div>
            {method.id !== 'csv' && (
              <button
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  alignSelf: 'flex-start',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Open API configuration
                }}
              >
                Configure API
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-secondary"
          onClick={onClose}
          style={{ padding: '14px 28px', fontSize: 16, fontWeight: 600 }}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => setStep(2)}
          disabled={!selectedMethod}
          style={{ padding: '14px 28px', fontSize: 16, fontWeight: 600 }}
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Configuration</h3>
      <div style={{ marginBottom: 32 }}>
        {selectedMethod === 'csv' ? (
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>File Upload</h4>

            {/* File Format Instructions */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <h5 style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#bfcfff' }}>📋 CSV/Excel Format Instructions</h5>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                <p style={{ marginBottom: 8 }}>
                  <strong>Required columns:</strong> Product Name, SKU
                </p>
                <p style={{ marginBottom: 8 }}>
                  <strong>Optional columns:</strong> Price, Page URL, Category, Image URL
                </p>
                <p style={{ marginBottom: 8 }}>
                  <strong>Multiple images:</strong> Create one row per image. Duplicate the product data and change only the Image URL.
                </p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                  Example: A product with 3 images = 3 rows with same Name/SKU but different Image URLs
                </p>
                <p style={{ fontSize: 12, color: '#ff6b6b', marginTop: 8 }}>
                  <strong>⚠️ Important:</strong> Image URLs must be valid HTTP/HTTPS URLs or relative paths.
                </p>
              </div>
            </div>

            <div
              style={{
                border: '2px dashed rgba(255,255,255,0.3)',
                borderRadius: 12,
                padding: 32,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 16,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.border = '2px dashed #4ecdc4';
                e.currentTarget.style.background = 'rgba(78, 205, 196, 0.1)';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.style.border = '2px dashed rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.border = '2px dashed rgba(255,255,255,0.3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleFileSelect(files[0]);
                }
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>📁</div>
              {selectedFile ? (
                <div>
                  <p style={{ color: '#4ecdc4', marginBottom: 8, fontWeight: 600 }}>✓ File Selected</p>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{selectedFile.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileError(null);
                    }}
                    style={{
                      background: 'rgba(255, 107, 107, 0.2)',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#ff6b6b',
                      fontSize: 12,
                      cursor: 'pointer',
                      marginTop: 8
                    }}
                  >
                    Remove File
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>Drag and drop your file here or click to browse</p>
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              Supported formats: {importConfig.supportedFormats.map(f => f.toUpperCase()).join(', ')}. Max file size: {(importConfig.maxFileSize / (1024 * 1024)).toFixed(0)}MB
            </p>
            {fileError && (
              <div style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
                color: '#ff6b6b',
                fontSize: 14
              }}>
                {fileError}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>API Configuration</h4>
            {importConfig.showApiConfig ? (
              <div style={{ display: 'grid', gap: 16 }}>
                <input
                  type="text"
                  placeholder="Store URL"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.10)',
                    color: 'white',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="API Key"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.10)',
                    color: 'white',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <input
                  type="text"
                  placeholder="API Secret (if required)"
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    background: 'rgba(255,255,255,0.10)',
                    color: 'white',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 }}>
                  API configuration is currently disabled
                </p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Contact your administrator to enable API integrations
                </p>
              </div>
            )}
          </div>
        )}

        {selectedMethod !== 'csv' && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Scheduling</h4>
            <div style={{ display: 'grid', gap: 16 }}>
              <select
                defaultValue={importConfig.defaultSchedule}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.10)',
                  color: 'white',
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                <option value="once">Import Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              {importConfig.showNotifications && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="checkbox"
                    id="notifications"
                    style={{ marginRight: 8 }}
                  />
                  <label htmlFor="notifications" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                    Send email notifications on import completion
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-secondary"
          onClick={() => setStep(1)}
          style={{ padding: '12px 24px' }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            if (selectedMethod === 'csv' && selectedFile) {
              await processFile(selectedFile);
            }
            setStep(3);
          }}
          disabled={selectedMethod === 'csv' && !selectedFile}
          style={{
            padding: '12px 24px',
            opacity: selectedMethod === 'csv' && !selectedFile ? 0.5 : 1,
            cursor: selectedMethod === 'csv' && !selectedFile ? 'not-allowed' : 'pointer'
          }}
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Preview & Mapping</h3>
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Sample Data Preview</h4>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          maxHeight: 200,
          overflow: 'auto'
        }}>
          <table style={{ width: '100%', fontSize: 12 }}>
            <thead>
              <tr style={{ color: 'rgba(255,255,255,0.6)' }}>
                {csvHeaders.map((header, index) => (
                  <th key={index} style={{ textAlign: 'left', padding: '8px' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.length > 0 ? (
                previewData.map((row, index) => (
                  <tr key={index} style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {csvHeaders.map((header, colIndex) => (
                      <td key={colIndex} style={{ padding: '8px' }}>{row[header] || ''}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <td colSpan={csvHeaders.length || 6} style={{ padding: '8px', textAlign: 'center' }}>
                    No data to preview. Please select a file first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Field Mapping</h4>
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Required Fields */}
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: '#ff6b6b', fontSize: 12, fontWeight: 600 }}>Required Fields</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>Name *:</span>
            <select
              value={fieldMapping['name'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, name: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>SKU *:</span>
            <select
              value={fieldMapping['sku'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, sku: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>

          {/* Optional Fields */}
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <span style={{ color: '#bfcfff', fontSize: 12, fontWeight: 600 }}>Optional Fields</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>Price:</span>
            <select
              value={fieldMapping['price'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, price: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>Page URL:</span>
            <select
              value={fieldMapping['page_url'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, page_url: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>Category:</span>
            <select
              value={fieldMapping['category'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, category: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, minWidth: 80 }}>Image URL:</span>
            <select
              value={fieldMapping['image_url'] || ''}
              onChange={(e) => setFieldMapping({...fieldMapping, image_url: e.target.value})}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.10)',
                color: 'white',
                fontSize: 14,
                outline: 'none',
                flex: 1
              }}
            >
              <option value="">-- Select Column --</option>
              {csvHeaders.map((header, index) => (
                <option key={index} value={header}>{header}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Validation Message */}
        {(!fieldMapping['name'] || !fieldMapping['sku']) && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: 8,
            padding: 12,
            marginTop: 16,
            color: '#ff6b6b',
            fontSize: 14
          }}>
            ⚠️ Please map the required fields (Name and SKU) before proceeding.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-secondary"
          onClick={() => setStep(2)}
          style={{ padding: '12px 24px' }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          onClick={async () => {
            await analyzeFileData();
            setStep(4);
          }}
          disabled={!fieldMapping['name'] || !fieldMapping['sku']}
          style={{
            padding: '12px 24px',
            opacity: (!fieldMapping['name'] || !fieldMapping['sku']) ? 0.5 : 1,
            cursor: (!fieldMapping['name'] || !fieldMapping['sku']) ? 'not-allowed' : 'pointer'
          }}
        >
          Next Step
        </button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h3 style={{ fontWeight: 700, fontSize: 24, marginBottom: 24, textAlign: 'center' }}>Review & Execute</h3>
      <div style={{ marginBottom: 32 }}>
        {analysisLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 24, marginBottom: 16 }}>📊</div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>Analyzing your data...</div>
          </div>
        ) : analysisData ? (
          <>
            {/* Dataset Statistics */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Dataset Analysis</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#4ecdc4' }}>{analysisData.stats.totalRows}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Total Rows</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>{analysisData.stats.uniqueSkus}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Unique Products</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#fbbf24' }}>{analysisData.stats.categoryCount}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Categories</div>
                </div>
              </div>
            </div>

            {/* Image Distribution */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Image Distribution</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#4ecdc4' }}>{analysisData.stats.imageDistribution.productsWith1Image}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>1 Image</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#667eea' }}>{analysisData.stats.imageDistribution.productsWith2Images}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>2 Images</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#36d399' }}>{analysisData.stats.imageDistribution.productsWith3PlusImages}</div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>3+ Images</div>
                </div>
              </div>
            </div>

            {/* Price Range */}
            {analysisData.stats.priceRange.min !== null && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                padding: 20,
                marginBottom: 20
              }}>
                <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Price Range</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Min Price</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ff6b6b' }}>${analysisData.stats.priceRange.min}</div>
                  </div>
                  <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.3)' }}>→</div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Max Price</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#36d399' }}>${analysisData.stats.priceRange.max}</div>
                  </div>
                </div>
              </div>
            )}



            {/* Import Summary */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20
            }}>
              <h4 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>Import Summary</h4>
              <div style={{ display: 'grid', gap: 8, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Import Method:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>
                    {importMethods.find(m => m.id === selectedMethod)?.name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Products to Import:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{analysisData.stats.uniqueSkus} products</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Total Images:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{analysisData.stats.productsWithImages} images</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.8)' }}>Estimated Time:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>
                    {(() => {
                      const totalMs = analysisData.stats.uniqueSkus * 10; // 10ms per product
                      if (totalMs < 1000) {
                        return `${totalMs}ms`;
                      } else if (totalMs < 60000) {
                        return `${Math.round(totalMs / 1000)}s`;
                      } else {
                        return `${Math.round(totalMs / 60000)}m ${Math.round((totalMs % 60000) / 1000)}s`;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>


          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ color: '#ff6b6b', fontSize: 16 }}>Failed to analyze data. Please try again.</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          className="btn-secondary"
          onClick={() => setStep(3)}
          style={{ padding: '12px 24px' }}
        >
          Back
        </button>
        <button
          className="btn-primary"
          onClick={executeImport}
          disabled={analysisLoading}
          style={{
            padding: '12px 24px',
            opacity: analysisLoading ? 0.5 : 1,
            cursor: analysisLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {analysisLoading ? 'Importing...' : 'Start Import'}
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style>
        {`
          .import-modal select option {
            background-color: rgba(30,32,44,0.98) !important;
            color: white !important;
          }
          .import-modal select option:hover {
            background-color: rgba(255,255,255,0.1) !important;
          }
        `}
      </style>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(10,10,10,0.45)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div
          className="import-modal"
          style={{
            background: 'rgba(30,32,44,0.98)',
            borderRadius: 24,
            padding: '3rem 3rem',
            color: 'white',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
            border: '2.5px solid rgba(255,255,255,0.18)',
            minWidth: 900,
            maxWidth: 1200,
            width: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
          }}
        >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 18,
            boxShadow: '0 2px 6px #0003'
          }}
        >
          ×
        </button>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 40,
          gap: 16
        }}>
          {[1, 2, 3, 4].map(stepNum => (
            <div
              key={stepNum}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: step >= stepNum ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 600,
                color: step >= stepNum ? 'white' : 'rgba(255,255,255,0.6)',
                border: step >= stepNum ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {stepNum}
            </div>
          ))}
        </div>

        {renderCurrentStep()}
        </div>
      </div>
    </>
  );
};

export default ImportWizardModal;
