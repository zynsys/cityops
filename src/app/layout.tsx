import type { Metadata } from "next";
import { Manrope, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { Header } from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CityOps",
  description: "Powering Modern City Operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${sourceSans.variable} ${manrope.variable} flex min-h-dvh flex-col font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <a
              href="#main-content"
              className="sr-only fixed top-3 left-4 z-[100] rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-raised focus:not-sr-only"
            >
              Skip to content
            </a>
            <Header />
            <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
