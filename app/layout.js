import './globals.css';

export const metadata = {
  title: 'voice2english — Hindi to English Translation',
  description: 'Record or upload Hindi audio and get an English translation instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
