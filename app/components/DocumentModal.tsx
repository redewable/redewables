'use client';

import { useState } from 'react';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
}

export default function DocumentModal({ isOpen, onClose, onVerify }: DocumentModalProps) {
  const [dateInput, setDateInput] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  if (!isOpen) return null;

  const formatDateInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as MM/DD/YYYY
    let formatted = '';
    if (digits.length > 0) {
      formatted = digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += '/' + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.substring(4, 8);
    }
    
    return formatted;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDateInput(formatted);
    setError('');
    setVerified(false);
    
    // Auto-check when complete
    if (formatted.length === 10) {
      checkDate(formatted);
    }
  };

  const correctDate = '04/11/2025';

  const checkDate = (input: string) => {
    if (input === correctDate) {
      setError('');
      setVerified(true);
    } else {
      setError('Incorrect date. Please review the document carefully.');
      setVerified(false);
    }
  };

  const handleVerify = () => {
    onVerify();
    onClose();
    // Reset for next time
    setDateInput('');
    setVerified(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">LAND CONTROL AGREEMENT</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          <div className="document-preview">
            <div className="document-header">
              <div className="document-stamp">CONFIDENTIAL</div>
              <div className="document-title">SURFACE USE AGREEMENT</div>
              <div className="document-subtitle">Jones County, Texas</div>
            </div>
            
            <div className="document-body">
              <p className="document-text">
                This Surface Use Agreement ("Agreement") is entered into by and between 
                <strong> ReDewable Energy Company, LLC</strong>, a Texas limited liability company 
                ("Operator"), and <strong>Landowner</strong>, regarding the property located in 
                Jones County, Texas, as more particularly described in Exhibit A attached hereto.
              </p>

              <div className="document-section">
                <div className="document-section-title">1. GRANT OF SURFACE USE</div>
                <p className="document-text">
                  Landowner hereby grants to Operator the exclusive right to use approximately 
                  50 acres of the Property for the construction, installation, operation, and 
                  maintenance of a battery energy storage system ("BESS") facility with a 
                  capacity of up to 400 megawatts.
                </p>
              </div>

              <div className="document-section">
                <div className="document-section-title">2. TERM</div>
                <p className="document-text">
                  The initial term of this Agreement shall be twenty (20) years, commencing on 
                  the Effective Date, with two (2) successive five (5) year renewal options.
                </p>
              </div>

              <div className="document-section">
                <div className="document-section-title">3. COMPENSATION</div>
                <p className="document-text">
                  Operator shall pay Landowner an annual surface use payment of $1,000 per acre 
                  for all acres utilized, payable in advance on each anniversary of the Effective Date.
                </p>
              </div>

              <div className="document-signature">
                <div className="signature-block">
                  <div className="signature-line">
                    <span className="signature-scrawl">John Smith</span>
                  </div>
                  <div className="signature-name">Landowner</div>
                  <div className="signature-date">Date: April 11, 2025</div>
                </div>
                <div className="signature-block">
                  <div className="signature-line">
                    <span className="signature-scrawl">Talor Byington</span>
                  </div>
                  <div className="signature-name">ReDewable Energy Company, LLC</div>
                  <div className="signature-date">Date: April 11, 2025</div>
                </div>
              </div>
            </div>
          </div>

          <div className="verification-section">
            <div className="verification-title">VERIFICATION REQUIRED</div>
            <p className="verification-text">
              To verify this document, enter the date the agreement was executed:
            </p>
            <div className="verification-input-row">
              <input
                type="text"
                className="verification-input"
                placeholder="MM/DD/YYYY"
                value={dateInput}
                onChange={handleDateChange}
                maxLength={10}
              />
              <button 
                className={`verification-btn ${verified ? 'verified' : ''}`}
                onClick={handleVerify}
                disabled={!verified}
              >
                {verified ? '✓ Verify Document' : 'Verify Document'}
              </button>
            </div>
            {error && <div className="verification-error">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}