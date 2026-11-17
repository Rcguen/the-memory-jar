"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <div className="relative z-10 container flex flex-col items-center px-4 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
          className="mb-8 space-y-3 text-center"
        >
          <p className="page-kicker text-[var(--text-caption)]">Account access</p>
          <h1 className="font-cormorant text-5xl font-medium leading-none tracking-tight text-[var(--text-primary)]">
            Find your key
          </h1>
          <p className="font-inter text-sm text-[var(--text-secondary)] sm:text-base">
            We&apos;ll help you return to your jar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.34, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          <div className="auth-card p-6 sm:p-8">
             <div className="relative z-10">
               <ResetPasswordForm />
             </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors font-inter"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
