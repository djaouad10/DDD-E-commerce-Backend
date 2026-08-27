import type { ProductSnapshot } from "#/domain/entities-snapshots/product.snapshot.js";
import type { RatingSnapshot } from "#/domain/entities-snapshots/rating.snapshot.js";

export function buildRatingRejectedEmailTemplate(data: {
  productSnapshot: ProductSnapshot;
  ratingSnapshot: RatingSnapshot;
  rejectedAt: Date;
}) {
  const { productSnapshot, ratingSnapshot, rejectedAt } = data;

  const stars =
    "★".repeat(ratingSnapshot.rating) + "☆".repeat(5 - ratingSnapshot.rating);

  return `
RATING REJECTED!

Hello,

We're unable to approve your rating for "${productSnapshot.name}" at this time.

Rating Submitted:
• Product: ${productSnapshot.name}
• Rating: ${ratingSnapshot.rating}/5 ${stars}
${ratingSnapshot.comment ? `• Comment: "${ratingSnapshot.comment}"\n` : ""}
• Submitted: ${new Date(ratingSnapshot.createdAt).toLocaleString()}
• Rejected: ${rejectedAt.toLocaleString()}

Common reasons for rejection include inappropriate content, spam, or irrelevant information.

If you believe this was a mistake or would like to submit a new rating, please contact us.

We appreciate your feedback and hope to see a new review from you soon.

Regards,
The Team
`;
}
