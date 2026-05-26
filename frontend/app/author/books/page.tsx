
"use client";
import { useEffect, useState } from "react";
import { booksApi } from "@/services/api";
import { Book } from "@/types";
import { PageHeader, Card, Spinner, EmptyState, Badge } from "@/app/components/ui/index";
import { formatINR, formatDate, BOOK_STATUS_CONFIG } from "@/utils/formatters";
import { cn } from "@/utils/formatters";

export default function MyBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    booksApi.getMyBooks().then(setBooks).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner size="lg" /></div>;
  }

  return (
    <div>
      <PageHeader title="My Books" description={`${books.length} book${books.length !== 1 ? "s" : ""} in your catalog`} />

      {books.length === 0 ? (
        <EmptyState title="No books yet" description="Your published books will appear here." />
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  const statusCfg = BOOK_STATUS_CONFIG[book.status] ?? { color: "bg-gray-100 text-gray-600" };
  const isPublished = book.status === "Published & Live";

  return (
    <Card>
      <div className="px-6 py-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{book.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>{book.genre}</span>
              {book.isbn && (
                <>
                  <span>·</span>
                  <span className="font-mono">{book.isbn}</span>
                </>
              )}
              {book.publicationDate && (
                <>
                  <span>·</span>
                  <span>{formatDate(book.publicationDate)}</span>
                </>
              )}
            </div>
          </div>
          <Badge className={statusCfg.color}>{book.status}</Badge>
        </div>

        {/* Royalty grid — only if published */}
        {isPublished ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <RoyaltyCell label="MRP" value={formatINR(book.mrp)} />
            <RoyaltyCell label="Copies Sold" value={book.totalCopiesSold.toLocaleString("en-IN")} />
            <RoyaltyCell label="Royalty Earned" value={formatINR(book.totalRoyaltyEarned)} />
            <RoyaltyCell
              label="Royalty Pending"
              value={formatINR(book.royaltyPending)}
              highlight={book.royaltyPending > 0}
            />
          </div>
        ) : (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              This book is currently in the <span className="font-medium text-slate-700">{book.status}</span> stage.
              Royalty data will be available after publication.
            </p>
          </div>
        )}

        {/* Platforms */}
        {book.availableOn.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Available on:</span>
            {book.availableOn.map((platform) => (
              <span
                key={platform}
                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded"
              >
                {platform}
              </span>
            ))}
          </div>
        )}

        {/* Last payout */}
        {book.lastRoyaltyPayoutDate && (
          <p className="text-xs text-slate-400 mt-2">
            Last payout: {formatDate(book.lastRoyaltyPayoutDate)}
          </p>
        )}
      </div>
    </Card>
  );
}

function RoyaltyCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={cn("text-sm font-semibold", highlight ? "text-amber-700" : "text-slate-900")}>
        {value}
      </p>
    </div>
  );
}