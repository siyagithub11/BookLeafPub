"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { booksApi, ticketsApi } from "@/services/api";
import { Book } from "@/types";
import { PageHeader, Card, CardBody, Button, Input, Textarea, Select } from "@/app/components/ui/index";
import { getApiErrorMessage } from "@/lib/axios";

const schema = z.object({
  bookId: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  description: z.string().min(20, "Please describe your issue in more detail (min 20 characters)"),
});

type FormData = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    booksApi.getMyBooks().then(setBooks);
  }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitError(null);
    try {
      const ticket = await ticketsApi.createTicket({
        bookId: data.bookId || null,
        subject: data.subject,
        description: data.description,
      });
      setSubmitSuccess(true);
      setTimeout(() => router.push(`/author/tickets/${ticket._id}`), 1500);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-medium text-slate-900">Ticket submitted successfully</p>
        <p className="text-sm text-slate-500 mt-1">Redirecting you to your ticket…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Submit a Support Ticket"
        description="Our team typically responds within 24-48 hours."
      />

      <Card>
        <CardBody className="py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Select
              label="Related book (optional)"
              {...register("bookId")}
            >
              <option value="">General / Account Level</option>
              {books.map((book) => (
                <option key={book._id} value={book._id}>
                  {book.title}{book.isbn ? ` — ${book.isbn}` : ""} ({book.status})
                </option>
              ))}
            </Select>

            <Input
              label="Subject"
              placeholder="e.g. Royalty payment not received for Q4 2023"
              error={errors.subject?.message}
              {...register("subject")}
            />

            <Textarea
              label="Describe your issue"
              placeholder="Please provide as much detail as possible — specific dates, amounts, book titles, and what you've already tried. This helps us resolve your issue faster."
              rows={7}
              error={errors.description?.message}
              {...register("description")}
            />

            {/* Attachment UI — upload is bonus, UI only */}
            <div className="rounded-md border border-dashed border-slate-300 px-4 py-5 text-center">
              <svg className="w-6 h-6 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <p className="text-sm text-slate-500">
                Attach files{" "}
                <span className="text-slate-400 text-xs">(PDF, PNG, JPG — optional)</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">File upload coming soon</p>
            </div>

            {submitError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={isSubmitting}>
                Submit ticket
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Tip:</strong> Our AI system will automatically categorize and prioritize your ticket.
          A draft response will be ready for our team within minutes. You'll be notified when we respond.
        </p>
      </div>
    </div>
  );
}
