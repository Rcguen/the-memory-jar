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
              <FormLabel className="font-inter text-sm text-[var(--text-secondary)]">Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="border-[var(--divider)] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-[var(--accent-primary)]/20"
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
              <FormLabel className="font-inter text-sm text-[var(--text-secondary)]">Key</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  {...field}
                  className="border-[var(--divider)] bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:border-[var(--accent-primary)] focus-visible:ring-[var(--accent-primary)]/20"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </FormControl>
              <div className="flex justify-end mt-1">
                <Link href="/reset-password" className="font-inter text-sm font-medium text-[var(--accent-primary)] hover:underline">
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
              className="font-inter text-center text-sm font-medium text-[var(--state-danger)]"
            >
              {state.error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full rounded-[var(--radius-small)] bg-[var(--accent-primary)] py-6 font-inter text-base font-medium text-white shadow-none transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_88%,black)]"
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
