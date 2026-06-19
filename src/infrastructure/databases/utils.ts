import { eq } from "drizzle-orm";
import { db } from "../config/database.js";
import { user } from "./schema.js";

// delete later when you make the UserRepository
export async function getUserById(userId: string) {
  const dbUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      role: true,
    },
  });

  return dbUser;
}
