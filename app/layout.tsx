// app/layout.tsx
import './global.css';
import { ReactNode } from 'react';


export const metadata = {
  title: 'Release Guard',
  description: 'Control your releases. Eliminate risk.',
};



export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
