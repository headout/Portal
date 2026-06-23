import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal — Video → 3D Gaussian Splat",
  description:
    "Portal turns a single phone video of any space into a photoreal, web-ready 3D Gaussian Splat. Built for Headout: seat-POV, 3D objects, and walkthrough tours.",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "Portal — Video → 3D Gaussian Splat",
    description:
      "One 4K video in. A photoreal, explorable 3D world out. Built for Headout experiences.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
