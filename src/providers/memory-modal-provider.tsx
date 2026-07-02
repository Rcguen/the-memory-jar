"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface MemoryModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const MemoryModalContext = createContext<MemoryModalContextType | undefined>(undefined);

export function MemoryModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <MemoryModalContext.Provider value={{ isOpen, openModal, closeModal }}>
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
