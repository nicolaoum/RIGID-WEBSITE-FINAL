import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { fetchCurrentUser, isAuthenticated } from '@/lib/auth';
import { submitInquiry } from '@/lib/api';

export default function Contact() {
  const [user, setUser] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const init = async () => {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    };
    init();
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    // Server-side /api/logout clears HttpOnly cookies and redirects to Cognito
    window.location.href = '/api/logout';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // Use secure api.ts helper — routes through proxy, no direct API Gateway call
      await submitInquiry(formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none";

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Contact Us - Rigid Residential</title>
        <meta name="description" content="Get in touch with Rigid Residential" />
      </Head>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-3xl font-extrabold tracking-tight text-slate-900">RIGID</Link>
            <div className="hidden md:flex items-center space-x-8">
              {['Home', 'Buildings', 'Portal', 'Contact'].map((item) => (
                <Link key={item} href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                  className={`text-base font-medium tracking-wide transition-colors ${item === 'Contact' ? 'text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm font-medium text-slate-600 hidden sm:inline">{user.email}</span>
                  <button onClick={handleLogout} className="text-base font-semibold px-5 py-2.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-all">Logout</button>
                </>
              ) : (
                <a href="/api/login" className="text-base font-semibold px-6 py-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all">Login</a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="pt-28 pb-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block text-emerald-600 font-semibold text-sm tracking-widest uppercase mb-3">Get In Touch</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">Contact Us</h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Have a question about our apartments or need assistance? We're here to help.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

            {/* Contact Form — takes 3 columns */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8 md:p-10">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Send us a Message</h2>
                <p className="text-slate-500 mb-8">Fill out the form and our team will get back to you within 24 hours.</p>

                {submitted && (
                  <div className="mb-8 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl flex items-center gap-3">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    <span className="font-medium">Thank you for your message! We'll get back to you soon.</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Your Name *</label>
                      <input type="text" required value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={inputClass} placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                      <input type="email" required value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputClass} placeholder="john@example.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <input type="tel" value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={inputClass} placeholder="+357 99 123456" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
                      <input type="text" required value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className={inputClass} placeholder="Inquiry about apartments" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Message *</label>
                    <textarea required rows={5} value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className={inputClass + ' resize-none'} placeholder="Tell us about your inquiry..." />
                  </div>

                  <button type="submit" disabled={sending}
                    className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-semibold text-lg hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 disabled:opacity-60">
                    {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>

            {/* Contact Info — takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Details Card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-8">
                <h2 className="text-xl font-extrabold text-slate-900 mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Email</h3>
                      <a href="mailto:info@rigidresidential.com" className="text-emerald-600 hover:text-emerald-700 transition text-sm">info@rigidresidential.com</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Phone</h3>
                      <a href="tel:+35725123456" className="text-emerald-600 hover:text-emerald-700 transition text-sm">+357 25 123 456</a>
                      <p className="text-xs text-slate-400 mt-0.5">Mon-Fri: 9AM-6PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Emergency Maintenance</h3>
                      <a href="tel:+35725123456" className="text-red-500 hover:text-red-600 font-semibold transition text-sm">+357 25 123 456</a>
                      <p className="text-xs text-slate-400 mt-0.5">Available 24/7</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Office Location</h3>
                      <p className="text-slate-600 text-sm">Nicosia, Cyprus</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Office Hours Card */}
              <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-8">
                <h2 className="text-xl font-extrabold mb-5">Office Hours</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Monday - Friday</span>
                    <span className="font-semibold text-sm bg-white/10 px-3 py-1 rounded-lg">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Saturday</span>
                    <span className="font-semibold text-sm bg-white/10 px-3 py-1 rounded-lg">10:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Sunday</span>
                    <span className="font-semibold text-sm bg-white/10 px-3 py-1 rounded-lg">Closed</span>
                  </div>
                </div>
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-emerald-400 text-sm font-medium">Emergency line available 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight mb-4">RIGID</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Premium living spaces designed for modern life in Nicosia, Cyprus.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-slate-300 mb-4">Quick Links</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><Link href="/buildings" className="hover:text-white transition">Buildings</Link></li>
                <li><Link href="/portal" className="hover:text-white transition">Resident Portal</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-slate-300 mb-4">Contact</h4>
              <div className="space-y-3 text-slate-400 text-sm">
                <a href="mailto:info@rigidresidential.com" className="block hover:text-white transition">info@rigidresidential.com</a>
                <a href="tel:+35725123456" className="block hover:text-white transition">+357 25 123 456</a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold tracking-widest uppercase text-slate-300 mb-4">Emergency</h4>
              <a href="tel:+35725123456" className="text-red-400 hover:text-red-300 transition font-semibold text-sm">+357 25 123 456</a>
              <p className="text-slate-500 text-xs mt-1">Available 24/7 for residents</p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Rigid Residential. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
