import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const baloo = localFont({
  src: "../fonts/baloo-latin.woff2",
  variable: "--font-display",
  weight: "400 800",
  display: "swap",
});

const balooBody = localFont({
  src: "../fonts/baloo-latin.woff2",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Métricas de soporte",
  description: "Dashboard de métricas semanales de un proyecto de Jira",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${baloo.variable} ${balooBody.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
