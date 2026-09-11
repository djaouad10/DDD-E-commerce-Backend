export const adminAuth = (userId?: string) =>
  `Bearer test-admin-token${userId ? " " + userId : ""}`;

export const clientAuth = (userId?: string) =>
  `Bearer test-client-token${userId ? " " + userId : ""}`;
