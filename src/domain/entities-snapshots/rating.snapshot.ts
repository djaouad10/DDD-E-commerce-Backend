export type RatingSnapshot = {
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
};
