"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProfileFormValues {
  fullName: string;
  headline: string;
  summary: string;
  phone: string;
  city: string;
  country: string;
  currentDesignation: string;
  currentCompany: string;
  totalExperienceMonths: string;
  noticePeriodDays: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
}

interface ApiIssue {
  path: (string | number)[];
  message: string;
}

type Feedback =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string; issues?: ApiIssue[] };

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseOptionalInt(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : "invalid";
}

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({ defaultValues: initial });

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);

    const totalExperienceMonths = parseOptionalInt(values.totalExperienceMonths);
    const noticePeriodDays = parseOptionalInt(values.noticePeriodDays);

    if (totalExperienceMonths === "invalid" || noticePeriodDays === "invalid") {
      setFeedback({
        kind: "error",
        message: "Experience and notice period must be whole numbers of months or days.",
      });
      return;
    }

    const response = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: nullableText(values.fullName),
        headline: nullableText(values.headline),
        summary: nullableText(values.summary),
        phone: nullableText(values.phone),
        city: nullableText(values.city),
        country: nullableText(values.country),
        currentDesignation: nullableText(values.currentDesignation),
        currentCompany: nullableText(values.currentCompany),
        totalExperienceMonths,
        noticePeriodDays,
        linkedinUrl: nullableText(values.linkedinUrl) ?? "",
        githubUrl: nullableText(values.githubUrl) ?? "",
        portfolioUrl: nullableText(values.portfolioUrl) ?? "",
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; issues?: ApiIssue[] }
      | null;

    if (!response.ok) {
      setFeedback({
        kind: "error",
        message: payload?.message ?? "Could not save the profile.",
        issues: payload?.issues,
      });
      return;
    }

    reset(values);
    setFeedback({ kind: "success", message: "Profile saved." });
    router.refresh();
  });

  const issueFor = (field: string): string | undefined =>
    feedback?.kind === "error"
      ? feedback.issues?.find((issue) => issue.path[0] === field)?.message
      : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Identity and positioning</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Only what you enter here is stored. Nothing is inferred or generated.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fullName" label="Full name" error={issueFor("fullName")}>
            <Input id="fullName" autoComplete="name" {...register("fullName")} />
          </Field>

          <Field id="headline" label="Professional headline" error={issueFor("headline")}>
            <Input
              id="headline"
              placeholder="Product-minded Full Stack Engineer"
              {...register("headline")}
            />
          </Field>

          <Field
            id="currentDesignation"
            label="Current designation"
            error={issueFor("currentDesignation")}
          >
            <Input id="currentDesignation" {...register("currentDesignation")} />
          </Field>

          <Field id="currentCompany" label="Current company" error={issueFor("currentCompany")}>
            <Input id="currentCompany" {...register("currentCompany")} />
          </Field>

          <div className="sm:col-span-2">
            <Field id="summary" label="Professional summary" error={issueFor("summary")}>
              <Textarea id="summary" rows={5} {...register("summary")} />
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Contact and availability</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Used only to populate applications you explicitly approve.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Phone" error={issueFor("phone")}>
            <Input id="phone" autoComplete="tel" {...register("phone")} />
          </Field>

          <Field id="city" label="City" error={issueFor("city")}>
            <Input id="city" autoComplete="address-level2" {...register("city")} />
          </Field>

          <Field id="country" label="Country" error={issueFor("country")}>
            <Input id="country" autoComplete="country-name" {...register("country")} />
          </Field>

          <Field
            id="totalExperienceMonths"
            label="Total experience (months)"
            hint="Whole months, for example 48."
            error={issueFor("totalExperienceMonths")}
          >
            <Input
              id="totalExperienceMonths"
              type="number"
              min={0}
              max={720}
              inputMode="numeric"
              {...register("totalExperienceMonths")}
            />
          </Field>

          <Field
            id="noticePeriodDays"
            label="Notice period (days)"
            error={issueFor("noticePeriodDays")}
          >
            <Input
              id="noticePeriodDays"
              type="number"
              min={0}
              max={365}
              inputMode="numeric"
              {...register("noticePeriodDays")}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Professional links</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Full URLs including https://. Leave blank if not applicable.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="linkedinUrl" label="LinkedIn" error={issueFor("linkedinUrl")}>
            <Input id="linkedinUrl" placeholder="https://" {...register("linkedinUrl")} />
          </Field>

          <Field id="githubUrl" label="GitHub" error={issueFor("githubUrl")}>
            <Input id="githubUrl" placeholder="https://" {...register("githubUrl")} />
          </Field>

          <Field id="portfolioUrl" label="Portfolio" error={issueFor("portfolioUrl")}>
            <Input id="portfolioUrl" placeholder="https://" {...register("portfolioUrl")} />
          </Field>
        </div>
      </div>

      {feedback?.kind === "error" ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-medium">{feedback.message}</p>
        </div>
      ) : null}

      {feedback?.kind === "success" ? (
        <div
          role="status"
          className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save profile"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {isDirty ? "Unsaved changes" : "All changes saved"}
        </p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
