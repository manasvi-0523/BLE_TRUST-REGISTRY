import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLE Trust Registry",
  description: "Real-time BLE trust violation detection dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem("ble_theme") || "dark";
                document.documentElement.classList.add(theme);
              } catch (error) {
                document.documentElement.classList.add("dark");
              }
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
