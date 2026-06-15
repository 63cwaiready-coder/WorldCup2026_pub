import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'World Cup 2026 @ 63',
  description: 'World Cup 2026 @ 63 — a friendly token betting game for World Cup 2026 fixtures.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>{children}</div>
        <footer
          style={{
            padding: '16px 24px 20px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 14,
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            background: '#0f172a',
          }}
        >
          World Cup 2026 @ 63
        </footer>
      </body>
    </html>
  );
}
