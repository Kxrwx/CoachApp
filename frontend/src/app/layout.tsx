import { AuthProvider } from "./context/AuthContext";
import "./globals.css";
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}