import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { MemoryModalProvider } from "@/providers/memory-modal-provider";
import { PhysicsProvider } from "@/providers/physics-provider";
import { MemoryViewerProvider } from "@/providers/memory-viewer-provider";
import { UnlockSchedulerProvider } from "@/providers/unlock-scheduler";
import { QueryProvider } from "@/providers/query-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { JarHeartbeat } from "@/components/jar/JarHeartbeat";
import { getProfile } from "@/services/auth";
import { Toaster } from "sonner";
import { PwaManager } from "@/components/ui/PwaManager";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Memory Jar",
  description: "A private digital time capsule for two hearts.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getProfile();

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        suppressHydrationWarning
        className={`${cormorantGaramond.variable} ${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <RealtimeProvider>
              <AuthProvider initialProfile={profile}>
                <MemoryModalProvider>
                  <PhysicsProvider>
                    <UnlockSchedulerProvider>
                      <MemoryViewerProvider>
                        <JarHeartbeat />
                        <PwaManager />
                        {children}
                      </MemoryViewerProvider>
                    </UnlockSchedulerProvider>
                  </PhysicsProvider>
                </MemoryModalProvider>
              </AuthProvider>
            </RealtimeProvider>
          </QueryProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
