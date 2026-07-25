"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSchemaProvider,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TRIAL_PROVIDER_BANDS,
  TRIAL_SERVICE_OPTIONS,
  type TrialWizardState,
} from "../constants";
import {
  completeTrialSignup,
  createOrUpdateTrialSession,
  sendTrialOtp,
  verifyTrialOtp,
} from "../api/trial-signup.api";

const TOTAL_STEPS = 6;

const identitySchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email(),
});

const businessSchema = z.object({
  businessName: z.string().min(2, "Business name is required"),
  website: z.string().optional(),
});

const phoneSchema = z.object({
  phoneE164: z
    .string()
    .min(10, "Enter a US phone number")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return (
        (d.length === 11 && d.startsWith("1")) ||
        d.length === 10 ||
        v.trim().startsWith("+1")
      );
    }, "Must be a US (+1) number"),
});

const otpSchema = z.object({
  code: z.string().min(4, "Enter the code we sent"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function postResize() {
  if (typeof window === "undefined" || !window.parent) return;
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
  );
  window.parent.postMessage(
    { type: "trial-signup-widget:resize", height },
    "*",
  );
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return `+${digits}`;
}

const initialState: TrialWizardState = {
  sessionId: null,
  servicesOffered: [],
  providerCountBand: null,
  firstName: "",
  lastName: "",
  email: "",
  businessName: "",
  website: "",
  phoneE164: "+1",
  phoneVerificationToken: null,
};

export function TrialSignupWizard() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<TrialWizardState>(initialState);
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const identityForm = useForm<z.infer<typeof identitySchema>>({
    resolver: zodResolver(identitySchema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });
  const businessForm = useForm<z.infer<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: { businessName: "", website: "" },
  });
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneE164: "+1" },
  });
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    postResize();
    const observer = new ResizeObserver(() => postResize());
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [step, otpSent]);

  useEffect(() => {
    void createOrUpdateTrialSession({ payload: {} })
      .then((res) =>
        setState((s) => ({ ...s, sessionId: res.sessionId })),
      )
      .catch(() => undefined);
  }, []);

  const persist = async (payload: Partial<TrialWizardState>) => {
    const next = { ...state, ...payload };
    setState(next);
    try {
      const res = await createOrUpdateTrialSession({
        sessionId: next.sessionId,
        payload: {
          servicesOffered: next.servicesOffered,
          providerCountBand: next.providerCountBand ?? undefined,
          firstName: next.firstName,
          lastName: next.lastName,
          email: next.email,
          businessName: next.businessName,
          website: next.website,
        },
      });
      setState((s) => ({ ...s, sessionId: res.sessionId }));
    } catch {
      /* draft persistence is best-effort */
    }
  };

  const toggleService = (value: TrialWizardState["servicesOffered"][number]) => {
    const exists = state.servicesOffered.includes(value);
    const servicesOffered = exists
      ? state.servicesOffered.filter((v) => v !== value)
      : [...state.servicesOffered, value];
    setState((s) => ({ ...s, servicesOffered }));
  };

  const onServicesContinue = async () => {
    if (state.servicesOffered.length === 0) {
      toast.error("Select at least one service");
      return;
    }
    await persist({ servicesOffered: state.servicesOffered });
    setStep(2);
  };

  const onProvidersContinue = async () => {
    if (!state.providerCountBand) {
      toast.error("Select how many providers you have");
      return;
    }
    await persist({ providerCountBand: state.providerCountBand });
    setStep(3);
  };

  const onIdentityContinue = identityForm.handleSubmit(async (values) => {
    await persist(values);
    setStep(4);
  });

  const onBusinessContinue = businessForm.handleSubmit(async (values) => {
    await persist(values);
    setStep(5);
    setOtpSent(false);
  });

  const onSendCode = phoneForm.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const phoneE164 = toE164(values.phoneE164);
      await sendTrialOtp({ phoneE164, sessionId: state.sessionId });
      setState((s) => ({ ...s, phoneE164 }));
      setOtpSent(true);
      toast.success("Verification code sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  });

  const onVerifyCode = otpForm.handleSubmit(async (values) => {
    setBusy(true);
    try {
      const res = await verifyTrialOtp({
        phoneE164: state.phoneE164,
        code: values.code,
      });
      setState((s) => ({
        ...s,
        phoneVerificationToken: res.phoneVerificationToken,
      }));
      setStep(6);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  });

  const onComplete = passwordForm.handleSubmit(async (values) => {
    if (!state.phoneVerificationToken || !state.providerCountBand) {
      toast.error("Please complete phone verification first");
      return;
    }
    setBusy(true);
    try {
      const res = await completeTrialSignup({
        sessionId: state.sessionId,
        servicesOffered: state.servicesOffered,
        providerCountBand: state.providerCountBand,
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        password: values.password,
        businessName: state.businessName,
        website: state.website || undefined,
        phoneVerificationToken: state.phoneVerificationToken,
      });
      const target = window.top ?? window;
      target.location.href = res.handoffUrl;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create account",
      );
      setBusy(false);
    }
  });

  return (
    <div
      ref={rootRef}
      className="mx-auto w-full max-w-xl bg-background px-4 py-8 text-foreground"
    >
      <p className="mb-2 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Step {step} of {TOTAL_STEPS}
      </p>

      {step === 1 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              What services do you offer?
            </h1>
            <p className="text-sm text-muted-foreground">
              Select all that apply. You can change these later.
            </p>
          </header>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TRIAL_SERVICE_OPTIONS.map((opt) => {
              const selected = state.servicesOffered.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleService(opt.value)}
                  className={cn(
                    "rounded-xl border px-3 py-4 text-sm font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card hover:bg-muted/60",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Button className="w-full" onClick={() => void onServicesContinue()}>
            Continue
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              How many service providers do you have?
            </h1>
          </header>
          <div className="grid grid-cols-2 gap-3">
            {TRIAL_PROVIDER_BANDS.map((band) => {
              const selected = state.providerCountBand === band.value;
              return (
                <button
                  key={band.value}
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      providerCountBand: band.value,
                    }))
                  }
                  className={cn(
                    "flex flex-col items-center gap-3 rounded-xl border px-3 py-6 transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:bg-muted/60",
                  )}
                >
                  <div className="flex flex-wrap justify-center gap-1">
                    {Array.from({ length: Math.min(band.dots, 8) }).map(
                      (_, i) => (
                        <span
                          key={i}
                          className="size-2 rounded-full bg-primary/70"
                        />
                      ),
                    )}
                  </div>
                  <span className="text-sm font-medium">{band.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => void onProvidersContinue()}
            >
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              What&apos;s your name and email?
            </h1>
          </header>
          <Form {...identityForm}>
            <FormSchemaProvider schema={identitySchema}>
              <form onSubmit={onIdentityContinue} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={identityForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter here" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={identityForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter here" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={identityForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </FormSchemaProvider>
          </Form>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              What&apos;s the name of your business?
            </h1>
          </header>
          <Form {...businessForm}>
            <FormSchemaProvider schema={businessSchema}>
              <form onSubmit={onBusinessContinue} className="space-y-4">
                <FormField
                  control={businessForm.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the name of your business"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={businessForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your website" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(3)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Continue
                  </Button>
                </div>
              </form>
            </FormSchemaProvider>
          </Form>
        </section>
      )}

      {step === 5 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              What&apos;s your cell phone number?
            </h1>
            <p className="text-sm text-muted-foreground">
              Final verification step. We&apos;ll text a code to a US (+1)
              number.
            </p>
          </header>
          {!otpSent ? (
            <Form {...phoneForm}>
              <FormSchemaProvider schema={phoneSchema}>
                <form onSubmit={onSendCode} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneE164"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone number (with country code)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(4)}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={busy}>
                      {busy ? "Sending…" : "Send code"}
                    </Button>
                  </div>
                </form>
              </FormSchemaProvider>
            </Form>
          ) : (
            <Form {...otpForm}>
              <FormSchemaProvider schema={otpSchema}>
                <form onSubmit={onVerifyCode} className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Enter the code sent to {state.phoneE164}
                  </p>
                  <FormField
                    control={otpForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification code</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="6-digit code"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => setOtpSent(false)}
                    >
                      Change number
                    </Button>
                    <Button type="submit" className="flex-1" disabled={busy}>
                      {busy ? "Verifying…" : "Verify"}
                    </Button>
                  </div>
                </form>
              </FormSchemaProvider>
            </Form>
          )}
        </section>
      )}

      {step === 6 && (
        <section className="space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Set your password
            </h1>
            <p className="text-sm text-muted-foreground">
              You&apos;ll sign in with <strong>{state.email}</strong>
            </p>
          </header>
          <Form {...passwordForm}>
            <FormSchemaProvider schema={passwordSchema}>
              <form onSubmit={onComplete} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            className="pr-9"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(5)}
                    disabled={busy}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={busy}>
                    {busy ? "Creating account…" : "Start trial"}
                  </Button>
                </div>
              </form>
            </FormSchemaProvider>
          </Form>
        </section>
      )}
    </div>
  );
}
