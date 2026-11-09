"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { FloatingParticles } from "@/components/jar/FloatingParticles";

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      {/* Decorative Background Elements */}
      <div className="auth-orb left-[10%] top-[18%] h-72 w-72 bg-rose-300/40 dark:bg-rose-700/20" />
      <div className="auth-orb bottom-[14%] right-[8%] h-96 w-96 bg-emerald-300/30 dark:bg-emerald-700/20" />
      
      <FloatingParticles count={15} />

      <div className="relative z-10 container flex flex-col items-center px-4 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.23, 1, 0.32, 1] }}
          className="text-center space-y-2 mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-cormorant">
            FORGOT YOUR KEY?
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 font-inter italic">
            Let&apos;s find it for you.
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
