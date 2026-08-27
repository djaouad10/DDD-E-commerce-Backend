import type { ProductSnapshot } from "#/domain/entities-snapshots/product.snapshot.js";
import type { RatingSnapshot } from "#/domain/entities-snapshots/rating.snapshot.js";

export function buildRatingApprovedEmailTemplate(data: {
  productSnapshot: ProductSnapshot;
  ratingSnapshot: RatingSnapshot;
  approvedAt: Date;
}) {
  const { productSnapshot, ratingSnapshot, approvedAt } = data;

  const stars =
    "★".repeat(ratingSnapshot.rating) + "☆".repeat(5 - ratingSnapshot.rating);

  return `
RATING APPROVED! ⭐

Hello,

Your rating for "${productSnapshot.name}" has been approved and is now live!

Rating Details:
• Product: ${productSnapshot.name}
• Brand: ${productSnapshot.brand}
• Rating: ${ratingSnapshot.rating}/5 ${stars}
${ratingSnapshot.comment ? `• Comment: "${ratingSnapshot.comment}"\n` : ""}
• Approved: ${approvedAt.toLocaleString()}

Thank you for sharing your experience with our community!

View your review on the product page or visit your account dashboard.

Questions? Contact us at [support email].

Thanks for your feedback!

Regards,
The Team
`;
}
