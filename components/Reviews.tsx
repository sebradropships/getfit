import { REVIEWS, reviewSummary, type Review } from "@/lib/offer-config";

function Stars({ rating, muted }: { rating: number; muted?: boolean }) {
  const full = Math.round(rating);
  return (
    <span
      className={muted ? "stars stars--muted" : "stars"}
      aria-label={`${rating} out of 5 stars`}
    >
      {"★".repeat(full)}
      {"☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="card">
      <Stars rating={review.rating} />
      {review.title && <h3>{review.title}</h3>}
      <p>{review.body}</p>
      <p style={{ marginTop: 14, fontSize: 13, color: "var(--stone)" }}>
        {review.author}
        {review.verified && " · Verified buyer"}
      </p>
    </article>
  );
}

/**
 * Renders only what REVIEWS actually contains.
 *
 * With no reviews there is no rating, no star row and no aggregate figure
 * anywhere on the page — and generateProductJsonLd omits aggregateRating to
 * match. Fabricated reviews carry FTC civil penalties per violation, and
 * review markup unsupported by on-page reviews earns a Google manual action.
 */
export default function Reviews() {
  const { count, average, hasReviews } = reviewSummary(REVIEWS);

  return (
    <section className="section" id="reviews">
      <div className="wrap">
        <div className="rev__head reveal">
          <span className="eyebrow">Social proof</span>
          <h2 className="h2" style={{ marginTop: 10 }}>
            Loved by everyday wearers.
          </h2>
        </div>

        {hasReviews ? (
          <>
            <div
              className="rev__head reveal"
              style={{ marginTop: 16, textAlign: "center" }}
            >
              <Stars rating={average} />
              <p style={{ marginTop: 6, fontWeight: 600 }}>{average} / 5</p>
              <p style={{ fontSize: 13, color: "var(--stone)" }}>
                Based on {count} verified customer{count === 1 ? "" : "s"}
              </p>
            </div>

            <div className="cards cards--3">
              {REVIEWS.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </>
        ) : (
          <div className="rev__empty reveal">
            <Stars rating={0} muted />
            <h3 style={{ marginTop: 12, fontSize: 19 }}>
              Be the first to review this piece.
            </h3>
            <p>
              We publish every review exactly as it is written, once real
              customers have worn it.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
