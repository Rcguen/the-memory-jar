"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { MemoryType } from "@/types/memory";

interface MemoryModalContextType {
  isOpen: boolean;
  selectedType: MemoryType | null;
  openModal: (typeOrEvent?: MemoryType | React.MouseEvent | unknown) => void;
  closeModal: () => void;
}

const MemoryModalContext = createContext<MemoryModalContextType | undefined>(undefined);

export function MemoryModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MemoryType | null>(null);

  const openModal = (typeOrEvent?: MemoryType | React.MouseEvent | unknown) => {
    setSelectedType(typeof typeOrEvent === "string" ? (typeOrEvent as MemoryType) : null);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
    setSelectedType(null);
  };

  return (
    <MemoryModalContext.Provider value={{ isOpen, selectedType, openModal, closeModal }}>
      {children}
    </MemoryModalContext.Provider>
  );
}

export function useMemoryModal() {
  const context = useContext(MemoryModalContext);
  if (context === undefined) {
    throw new Error("useMemoryModal must be used within a MemoryModalProvider");
  }
  return context;
}
