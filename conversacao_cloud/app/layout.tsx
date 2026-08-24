import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversação Cloud - Sistema que Transforma Conversa em Ação",
  description: "Captura clínica, transcrição e geração de notas estruturadas com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-slate-800 font-sans">{children}</body>
    </html>
  );
}
