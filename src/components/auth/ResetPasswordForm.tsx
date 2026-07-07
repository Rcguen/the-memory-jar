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
        <h2 className="text-2xl font-cormorant text-zinc-900 dark:text-zinc-50">Check your email</h2>
        <p className="text-zinc-600 dark:text-zinc-400 font-inter text-sm">
          We&apos;ve sent a magical link to reset your key. Please check your inbox.
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
            "Send Reset Link"
          )}
        </Button>
      </form>
    </Form>
  );
}
