import type { Metadata } from "next";
import { Geist, Martian_Mono } from "next/font/google";
import "./globals.css";
import { SabarProvider } from "@/store/SabarContext";
import { AuthProvider } from "@/store/AuthContext";
import { Topbar } from "@/components/layout/Topbar";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { PositionCalculator } from "@/components/journal/PositionCalculator";
import { CloudStatus } from "@/components/layout/CloudStatus";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Martian_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sabar System — Trading Journal",
  description: "Personal trading journal and checklist system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="bg-black text-white min-h-screen">
        <AuthProvider>
        <SabarProvider>
          <div className="flex min-h-screen">
            <div className="flex-1 flex flex-col min-w-0">
              <AuthGuard>
              <Topbar />
              <PositionCalculator />
              <main className="flex-1 p-4 md:p-6 overflow-auto">
                {children}
              </main>
              <CloudStatus />
            </AuthGuard>
            </div>
          </div>
        </SabarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
