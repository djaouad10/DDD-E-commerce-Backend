import type { UserSnapshot } from "#/domain/entities-snapshots/user.snapshot.js";

export function buildUserRegisteredEmailTemplate(data: {
  userSnapshot: UserSnapshot;
}) {
  const { userSnapshot } = data;
  const registeredAt = new Date(userSnapshot.createdAt);

  if (userSnapshot.role === "ADMIN") {
    return `
NEW ADMIN REGISTERED

Admin Account Created:
• Name: ${userSnapshot.name}
• Email: ${userSnapshot.email}
• ID: ${userSnapshot.id}
• Registered: ${registeredAt.toLocaleString()}

Please verify and grant appropriate admin access.

[Admin Dashboard]
`;
  }

  return `
WELCOME ${userSnapshot.name.toUpperCase()}! 🎉

Thanks for joining us! Your account has been created successfully.

Account Details:
• Email: ${userSnapshot.email}
• Registered: ${registeredAt.toLocaleString()}

Get started by visiting our shop: [website URL]

Questions? Contact us at [support email].

Welcome aboard!
The Team
`;
}
