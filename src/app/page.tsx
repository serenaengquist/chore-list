'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [status, setStatus] = useState<string>('Initializing connection...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test Supabase connection
        const { data, error } = await supabase
          .from('users')
          .select('count()', { count: 'exact', head: true });

        if (error) {
          setStatus(`Connection failed: ${error.message}`);
          setIsConnected(false);
        } else {
          setStatus('Connected to Supabase');
          setIsConnected(true);
        }
      } catch (err) {
        setStatus(`Error: ${err}`);
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  return (
    <main className="container">
      <section style={{ paddingBlock: 'var(--space-3xl)' }}>
        <div className="text-center mb-lg">
          <h1>CHORE LIST</h1>
          <p className="text-muted">A retro-terminal task management system</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-3xl)' }}>
          {/* Status Card */}
          <article className="card">
            <header className="card-header">
              <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-mute)' }}>
                // System Status
              </span>
              <span className={`chip ${isConnected ? 'chip-voltage' : ''}`}>
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </header>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>SUPABASE</h3>
            <p>{status}</p>
            <footer className="card-footer">
              <span>v0.1.0</span>
              <span>READY</span>
            </footer>
          </article>

          {/* Setup Card */}
          <div className="card-feature">
            <header className="card-header" style={{ borderColor: 'var(--color-ink)', color: 'var(--color-ink)' }}>
              <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-ink)' }}>
                // Quick Start
              </span>
            </header>
            <h3 style={{ marginBottom: 'var(--space-md)', color: 'var(--color-ink)' }}>CONFIGURE</h3>
            <p style={{ color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>
              Update your Supabase queries in the code to start managing chores.
            </p>
            <button className="btn-primary" style={{ width: '100%' }}>
              View Docs
            </button>
            <footer className="card-footer" style={{ borderColor: 'var(--color-ink)', color: 'var(--color-ink)' }}>
              <span>Powered by</span>
              <span>SUPABASE</span>
            </footer>
          </div>

          {/* Features Card */}
          <article className="card">
            <header className="card-header">
              <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-mute)' }}>
                // Features
              </span>
            </header>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>READY TO BUILD</h3>
            <ul style={{ listStyle: 'none', marginBottom: 'var(--space-md)' }}>
              <li style={{ marginBottom: 'var(--space-sm)' }}>✓ Supabase connected</li>
              <li style={{ marginBottom: 'var(--space-sm)' }}>✓ Glitchtype design system</li>
              <li style={{ marginBottom: 'var(--space-sm)' }}>✓ Vercel ready</li>
            </ul>
            <footer className="card-footer">
              <span>ENV</span>
              <span>LOADED</span>
            </footer>
          </article>
        </div>

        {/* Terminal Panel */}
        <section className="terminal">
          <header className="terminal-titlebar">
            <span className="terminal-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>chore-list.sh</span>
            <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wider)', color: 'var(--color-mute)' }}>
              SESSION 01
            </span>
          </header>
          <div className="terminal-body">
            <div className="terminal-line">
              <span style={{ color: 'var(--color-ink)' }}>npm run dev</span>
            </div>
            <div className="terminal-line is-out">
              <span style={{ color: 'var(--color-mute)' }}>compiled in 0.42s · 0 warnings</span>
            </div>
            <div className="terminal-line is-out">
              <span style={{ color: 'var(--color-fg-muted)' }}>Ready on http://localhost:3000</span>
            </div>
            <div className="terminal-prompt">
              <span className="terminal-caret"></span>
            </div>
          </div>
        </section>

        {/* Footer Section */}
        <div style={{ marginTop: 'var(--space-3xl)', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-fg-muted)', fontSize: 'var(--text-body-sm)', marginBottom: 'var(--space-md)' }}>
            Built with Next.js 16 · Supabase · Vercel
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-secondary">
              Documentation
            </button>
            <button className="btn-secondary">
              Deploy
            </button>
            <button className="btn-secondary">
              GitHub
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
