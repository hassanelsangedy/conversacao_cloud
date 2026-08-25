"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Activity,
  X,
  Sparkles,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportedReportTemplate } from "@/lib/report-template-schema";

interface ImportTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateImported: (template: ImportedReportTemplate) => void;
}

export function ImportTemplateModal({
  isOpen,
  onClose,
  onTemplateImported,
}: ImportTemplateModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const allowedExtensions = [".docx", ".doc", ".pdf", ".png", ".jpg", ".jpeg", ".webp"];
    const fileName = file.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isAllowed) {
      setErrorMessage("Formato não suportado. Por favor, envie arquivos Word (.doc, .docx), PDF ou Imagens (.png, .jpg, .jpeg).");
      return;
    }

    const MAX_SIZE_MB = 25;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`Arquivo excede o limite máximo permitido de ${MAX_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(1);

    try {
      // Etapa 1: Upload
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulação visual de transição de etapas do OCR
      const stepInterval = setTimeout(() => {
        setCurrentStep(2);
      }, 1200);

      const step2Interval = setTimeout(() => {
        setCurrentStep(3);
      }, 2600);

      const res = await fetch("/api/templates/import", {
        method: "POST",
        body: formData,
      });

      clearTimeout(stepInterval);
      clearTimeout(step2Interval);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || "Falha na extração e parsing do modelo.");
      }

      setIsProcessing(false);
      onTemplateImported(data.template);
      onClose();
    } catch (err: any) {
      console.error("[Import Modal Error]:", err);
      setErrorMessage(err?.message || "Erro ao processar arquivo. Tente novamente.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative text-left max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 mb-4">
          <div
            style={{ backgroundColor: "rgba(0, 106, 85, 0.1)", color: "#006A55" }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-xs"
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Importar Modelo de Relatório via IA
            </h2>
            <p className="text-xs text-slate-500">
              Faça upload de documentos Word, PDFs ou Imagens para engenharia reversa automática.
            </p>
          </div>
        </div>

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="leading-tight font-medium">{errorMessage}</div>
          </div>
        )}

        {isProcessing ? (
          /* Visual de Processamento da IA */
          <div className="py-8 space-y-6 text-center">
            <div
              style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
              className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md shadow-[#006A55]/10 animate-bounce"
            >
              <Activity className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Engenharia Reversa & OCR em Andamento
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Analisando estrutura visual, tabelas, enunciados e variáveis dinâmicas do arquivo.
              </p>
            </div>

            {/* Stepper de Progresso */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3 text-xs max-w-md mx-auto">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#006A55] shrink-0" />
                <span className="font-semibold text-slate-800">
                  Upload e leitura do arquivo ({selectedFile?.name})
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {currentStep >= 2 ? (
                  <Activity className="w-4 h-4 text-[#006A55] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    2
                  </div>
                )}
                <span
                  className={cn(
                    "font-semibold",
                    currentStep >= 2 ? "text-[#006A55]" : "text-slate-400"
                  )}
                >
                  Visão Computacional & OCR de Layout (Gemini Vision)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {currentStep >= 3 ? (
                  <Activity className="w-4 h-4 text-[#006A55] animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                    3
                  </div>
                )}
                <span
                  className={cn(
                    "font-semibold",
                    currentStep >= 3 ? "text-[#006A55]" : "text-slate-400"
                  )}
                >
                  Mapeamento de seções, perguntas e tags dinâmicas &lt;&lt;TAG&gt;&gt;
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Área de Seleção / Dropzone */
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".docx,.doc,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200",
                isDragging
                  ? "border-[#006A55] bg-emerald-50/60 scale-[1.01]"
                  : "border-slate-300 hover:border-[#006A55] bg-slate-50/60 hover:bg-emerald-50/20"
              )}
            >
              <div
                style={{ backgroundColor: "rgba(0, 106, 85, 0.08)", color: "#006A55" }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs"
              >
                <UploadCloud className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Arraste seu modelo de relatório ou clique para selecionar
              </h3>
              <p className="text-xs text-slate-500 mb-3 max-w-sm mx-auto">
                Suporte a documentos Word (.docx, .doc), PDFs e Imagens digitalizadas (.png, .jpg, .jpeg) de até 25MB.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  Word (.docx)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  PDF
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                  PNG / JPG / Scanner
                </span>
              </div>
            </div>

            {/* Arquivo Selecionado */}
            {selectedFile && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {selectedFile.name.endsWith(".docx") || selectedFile.name.endsWith(".doc") ? (
                      <FileText className="w-4 h-4 text-blue-600" />
                    ) : selectedFile.name.endsWith(".pdf") ? (
                      <FileCheck className="w-4 h-4 text-rose-600" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dicas de Extração */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                Como a IA processará seu arquivo:
              </span>
              <p className="text-amber-800 leading-relaxed text-[10px]">
                A IA identificará os cabeçalhos, logos institucionais, quebras de página, perguntas e tabelas, convertendo cada resposta em uma tag inteligente no padrão <code className="bg-white/80 px-1 py-0.5 rounded font-mono">&lt;&lt;NOME_DO_CAMPO&gt;&gt;</code> pronta para preenchimento automatizado.
              </p>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleProcessFile}
                disabled={!selectedFile || isProcessing}
                style={{ backgroundColor: "#006A55" }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md shadow-[#006A55]/20 hover:opacity-90 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Iniciar Extração com IA</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
