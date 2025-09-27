import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Landing: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLUListElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <div className={`mobile-menu-backdrop ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
      <header style={{ background: 'rgba(10,10,10,0.65)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <nav className="container">
          <button className="logo" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>VirtualFit</button>
          <ul ref={mobileMenuRef} className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <li><a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a></li>
            <li><a href="#integration" onClick={() => setMobileMenuOpen(false)}>Integration</a></li>
            <li><a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</a></li>
            <li><a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a></li>
            <li><a href="/demo-store" onClick={() => setMobileMenuOpen(false)}>Demo Store</a></li>
          </ul>
          {!isLoggedIn ? (
            <>
              <button className="cta-button" onClick={() => navigate('/login')}>Login</button>
              <button ref={hamburgerRef} className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
              </button>
            </>
          ) : (
            <>
              <button className="cta-button" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button ref={hamburgerRef} className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}></span>
              </button>
            </>
          )}
        </nav>
      </header>
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Transform E-commerce with <span className="highlight">AI-Powered</span> Virtual Try-On</h1>
              <p>Integrate our cutting-edge virtual try-on technology in minutes and boost your conversions by 40%. The future of online shopping is here.</p>
              <div className="hero-buttons">
                <button className="btn-primary" onClick={() => navigate('/register')}>🚀 Get Started Free</button>
                <a href="/demo-store" className="btn-secondary">📱 View Demo</a>
              </div>
              <div className="stats-preview">
                <div className="stat-item">
                  <h3>65%</h3>
                  <p>Return Reduction</p>
                </div>
                <div className="stat-item">
                  <h3>5min</h3>
                  <p>Setup Time</p>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="demo-container">
                <div className="phone-3d">
                  <div className="phone-frame">
                    <div className="phone-screen">
                      <div className="screen-content">
                        <div className="virtual-avatar">
                          <div className="avatar-silhouette"></div>
                          <div className="clothing-item"></div>
                        </div>
                        <div className="try-on-label">AI Virtual Try-On</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="particles">
                  <div className="particle" style={{ left: '10%', animationDelay: '0s' }}></div>
                  <div className="particle" style={{ left: '20%', animationDelay: '2s' }}></div>
                  <div className="particle" style={{ left: '30%', animationDelay: '4s' }}></div>
                  <div className="particle" style={{ left: '40%', animationDelay: '6s' }}></div>
                  <div className="particle" style={{ left: '50%', animationDelay: '1s' }}></div>
                  <div className="particle" style={{ left: '60%', animationDelay: '3s' }}></div>
                  <div className="particle" style={{ left: '70%', animationDelay: '5s' }}></div>
                  <div className="particle" style={{ left: '80%', animationDelay: '7s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="features" id="features">
        <div className="container">
          <h2 className="section-title">Why Choose VirtualFit?</h2>
          <div className="bento-grid">
            <div className="bento-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast Integration</h3>
              <p>Deploy our virtual try-on solution in under 5 minutes with a single line of code. Compatible with all major e-commerce platforms including Shopify, WooCommerce, Magento, and custom builds.</p>
            </div>
            <div className="bento-card">
              <div className="feature-icon">🎯</div>
              <h3>95% Accuracy</h3>
              <p>Our AI delivers ultra-realistic virtual try-on experiences with industry-leading precision.</p>
            </div>
            <div className="bento-card">
              <div className="feature-icon">📱</div>
              <h3>Multi-Platform</h3>
              <p>Works seamlessly across mobile, tablet, and desktop devices with responsive design.</p>
            </div>
            <div className="bento-card">
              <div className="feature-icon">🧠</div>
              <h3>Advanced AI</h3>
              <p>Powered by cutting-edge machine learning algorithms that understand body types, clothing physics, and lighting conditions for the most realistic virtual try-on experience.</p>
            </div>
            <div className="bento-card">
              <div className="feature-icon">🔧</div>
              <h3>Fully Customizable</h3>
              <p>Adapt the interface to match your brand identity with custom themes, colors, and layouts.</p>
            </div>
            <div className="bento-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track engagement metrics and conversion rates with our comprehensive dashboard.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="integration" id="integration">
        <div className="container">
          <div className="integration-content">
            <div className="integration-text">
              <h2>Seamless Integration in 3 Steps</h2>
              <p>Our solution integrates perfectly with your existing infrastructure without requiring major code changes or technical expertise.</p>
              <ul className="integration-steps">
                <li><span className="step-number">1</span>Add our lightweight SDK to your product pages</li>
                <li><span className="step-number">2</span>Configure your product catalog via our intuitive API</li>
                <li><span className="step-number">3</span>Enable virtual try-on and watch conversions soar</li>
              </ul>
              <a href="#" className="btn-primary">View Full Documentation</a>
            </div>
            <div className="code-terminal">
              <div className="terminal-header">
                <div className="terminal-dot red"></div>
                <div className="terminal-dot yellow"></div>
                <div className="terminal-dot green"></div>
              </div>
              <div className="code-preview">
                <div className="code-line"><span className="comment">// Add VirtualFit to your site</span></div>
                <div className="code-line"><span className="keyword">import</span> <span className="string">'@virtualfit/sdk'</span>;</div>
                <div className="code-line"></div>
                <div className="code-line"><span className="keyword">VirtualFit</span>.<span className="keyword">init</span>&#123; </div>
                <div className="code-line">  <span className="keyword">apiKey</span>: <span className="string">'your-api-key'</span>,</div>
                <div className="code-line">  <span className="keyword">container</span>: <span className="string">'#try-on-widget'</span>,</div>
                <div className="code-line">  <span className="keyword">product</span>: &#123;</div>
                <div className="code-line">    <span className="keyword">id</span>: <span className="string">'product-123'</span>,</div>
                <div className="code-line">    <span className="keyword">category</span>: <span className="string">'clothing'</span></div>
                <div className="code-line">  &#125;</div>
                <div className="code-line">&#125;;</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="testimonials" id="testimonials">
        <div className="container">
          <h2 className="section-title">Trusted by Industry Leaders</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                "VirtualFit transformed our online store. We saw a 45% increase in conversions within the first month and returns dropped by 60%. The integration was seamless and their support team is exceptional."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">SM</div>
                <div className="author-info">
                  <h4>Sarah Mitchell</h4>
                  <p>CEO, FashionForward</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                "The virtual try-on feature has become our customers' favorite tool. It's incredibly accurate and the setup took less than 10 minutes. Our mobile conversions have never been higher."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">JC</div>
                <div className="author-info">
                  <h4>James Chen</h4>
                  <p>CTO, StyleHub</p>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                "We integrated VirtualFit across all our brands and the results speak for themselves. Customer satisfaction is up 35% and we're saving thousands on returns processing."
              </div>
              <div className="testimonial-author">
                <div className="author-avatar">AL</div>
                <div className="author-info">
                  <h4>Anna Lopez</h4>
                  <p>VP Digital, RetailMax</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>VirtualFit</h3>
              <p>The next-generation virtual try-on solution for modern e-commerce.</p>
            </div>
            <div className="footer-section">
              <h3>Product</h3>
              <a href="#">Features</a>
              <a href="#">Integration</a>
              <a href="#">API Documentation</a>
              <a href="#">SDKs</a>
            </div>
            <div className="footer-section">
              <h3>Company</h3>
              <a href="#">About Us</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Press</a>
            </div>
            <div className="footer-section">
              <h3>Support</h3>
              <a href="#">Help Center</a>
              <a href="#">Contact</a>
              <a href="#">Status</a>
              <a href="#">Community</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 VirtualFit. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Landing;
