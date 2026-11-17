"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { resetPasswordRequestAction } from "@/app/actions/auth";
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

const resetSchema = z.object({
  username: z.string().min(1, "Please enter your name."),
});

type ResetValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(resetPasswordRequestAction, {});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      username: "",
    },
  });

  if (!mounted) return null;

  if (state?.success) {
    return (
      <div className="text-center space-y-4">
        <h2 className="font-cormorant text-3xl text-[var(--text-primary)]">Check your email</h2>
        <p className="font-inter text-sm text-[var(--text-secondary)]">
          We&apos;ve sent a link to reset your key. Please check your inbox.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
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
            "Send Reset Link"
          )}
        </Button>
      </form>
    </Form>
  );
}
