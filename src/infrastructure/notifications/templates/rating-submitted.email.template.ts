import type { ProductSnapshot } from "#/domain/entities-snapshots/product.snapshot.js";
import type { RatingSnapshot } from "#/domain/entities-snapshots/rating.snapshot.js";

export function buildRatingSubmittedEmailTemplate(data: {
  productSnapshot: ProductSnapshot;
  ratingSnapshot: RatingSnapshot;
  submittedAt: Date;
}) {
  const { productSnapshot, ratingSnapshot, submittedAt } = data;

  const stars =
    "★".repeat(ratingSnapshot.rating) + "☆".repeat(5 - ratingSnapshot.rating);

  return `
NEW RATING - AWAITING APPROVAL ⭐

Admin Alert,

A new rating for "${productSnapshot.name}" needs your review.

Rating Details:
• Product: ${productSnapshot.name} (${productSnapshot.id})
• User: ${ratingSnapshot.userId}
• Rating: ${ratingSnapshot.rating}/5 ${stars}
${ratingSnapshot.comment ? `• Comment: "${ratingSnapshot.comment}"\n` : "• Comment: None\n"}
• Submitted: ${submittedAt.toLocaleString()}

Product Info:
• Brand: ${productSnapshot.brand}
• Price: ${productSnapshot.price.amount} ${productSnapshot.price.currency}
• Current Avg Rating: ${productSnapshot.averageRating || "N/A"}

Action Required:
Please review and approve/reject this rating in the admin dashboard.

Regards,
System Notification
`;
}
