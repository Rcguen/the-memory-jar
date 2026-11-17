"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="relative z-10 container flex flex-col items-center px-0 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8 space-y-3 text-center"
        >
          <p className="page-kicker text-[var(--text-caption)]">A private keepsake archive</p>
          <h1 className="font-cormorant text-5xl font-medium leading-none tracking-tight text-[var(--text-primary)] sm:text-6xl">
            The Memory Jar
          </h1>
          <p className="font-inter text-sm text-[var(--text-secondary)] sm:text-base">
            A quiet place for the two of you.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          <div className="auth-card p-5 sm:p-8">
             <div className="relative z-10">
               <LoginForm />
             </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
