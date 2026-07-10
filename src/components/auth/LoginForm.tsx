"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  username: z.string().min(1, "Please enter your name."),
  password: z.string().min(1, "Please enter the key."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (!mounted) return null;

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-5 sm:space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-600 dark:text-zinc-400 font-inter">Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border-white/60 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-rose-500/30"
                  autoComplete="username"
                  placeholder="Your name"
                />
              </FormControl>
              <FormMessage className="text-rose-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-600 dark:text-zinc-400 font-inter">Key</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border-white/60 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-rose-500/30"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </FormControl>
              <div className="flex justify-end mt-1">
                <Link href="/reset-password" className="text-sm font-medium text-rose-500 hover:text-rose-400 font-inter">
                  Forgot password?
                </Link>
              </div>
              <FormMessage className="text-rose-500" />
            </FormItem>
          )}
        />

        <AnimatePresence mode="wait">
          {state.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm font-medium text-rose-500 text-center font-inter"
            >
              {state.error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-full py-6 text-lg font-medium shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/40 font-inter group"
        >
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Enter"
          )}
        </Button>
      </form>
    </Form>
  );
}
