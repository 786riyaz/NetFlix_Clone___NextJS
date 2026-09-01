import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
title: "Vault — Your Local Video Library",
description: "A self-hosted, Netflix-style player for your own video library.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body>{children}</body>
</html>
);
}
