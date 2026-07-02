"use client";

import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";
import { FloatingParticles } from "@/components/jar/FloatingParticles";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-rose-50 to-white dark:from-zinc-950 dark:to-zinc-900 transition-colors duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-rose-200/30 dark:bg-rose-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/30 dark:bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Subtle Floating Particles */}
      <FloatingParticles count={15} />

      <div className="relative z-10 container flex flex-col items-center px-4 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-2 mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-cormorant">
            THE MEMORY JAR
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 font-inter italic">
            Welcome Home.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="w-full"
        >
          <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/60 dark:border-zinc-800/50 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
             {/* Inner glow */}
             <div className="absolute inset-0 bg-gradient-to-t from-rose-100/10 to-transparent dark:from-rose-900/5 pointer-events-none" />
             
             <div className="relative z-10">
               <LoginForm />
             </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
