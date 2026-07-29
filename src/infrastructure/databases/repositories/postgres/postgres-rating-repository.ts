import type { Rating } from "#/domain/entities/rating.js";
import type { RatingRepository } from "#/domain/repositories/rating.repository.js";
import type { ProductId } from "#/domain/value-objects/product-id.js";
import type { UserId } from "#/domain/value-objects/user-id.js";
import type {
  DrizzleDBClient,
  DrizzleTransactionClient,
} from "#/infrastructure/config/database.js";
import { and, eq } from "drizzle-orm";
import {
  PostgresRatingMapper,
  type RatingRow,
} from "../../mappers/postgres/postgres-rating-mapper.js";
import { rating } from "../../schema.js";
import type { TransactionClient } from "#/shared/types/transaction-client.js";
import { handleDrizzleErrors } from "#/shared/errors/handle-drizzle-errors.js";
import { createLogger } from "#/shared/logging/logger.js";

export class PostgresRatingRepository implements RatingRepository {
  private readonly logger = createLogger("PostgresRatingRepository");

  constructor(private db: DrizzleDBClient) {}
  async find(userId: UserId, productId: ProductId): Promise<Rating | null> {
    this.logger.debug("find called", {
      userId: userId.value,
      productId: productId.value,
    });

    try {
      const ratingRow: RatingRow | undefined = await this.logger.measure(
        "db.query.rating.findFirst",
        () =>
          this.db.query.rating.findFirst({
            where: (rating, { and, eq }) =>
              and(
                eq(rating.user_id, userId.value),
                eq(rating.product_id, productId.value),
              ),
          }),
      );

      if (!ratingRow) {
        this.logger.debug("rating not found", {
          userId: userId.value,
          productId: productId.value,
        });

        return null;
      }

      const ratingToReturn = PostgresRatingMapper.toDomain(ratingRow);

      this.logger.debug("find completed", {
        rating: ratingToReturn.toSnapshot(),
      });

      return ratingToReturn;
    } catch (error) {
      this.logger.error("find failed", error as Error, {
        userId: userId.value,
        productId: productId.value,
      });

      handleDrizzleErrors(error, "PostgresRatingRepository.find");
    }
  }

  async findManyByProductId(productId: ProductId): Promise<Rating[]> {
    this.logger.debug("findManyByProductId called", {
      productId: productId.value,
    });

    try {
      const ratingRows: RatingRow[] = await this.logger.measure(
        "db.query.rating.findMany",
        () =>
          this.db.query.rating.findMany({
            where: (rating, { eq }) => eq(rating.product_id, productId.value),
          }),
      );

      const ratingsToReturn = ratingRows.map(PostgresRatingMapper.toDomain);

      this.logger.debug("findManyByProductId completed", {
        ratingsCount: ratingsToReturn.length,
      });

      return ratingsToReturn;
    } catch (error) {
      this.logger.error("findManyByProductId failed", error as Error, {
        productId: productId.value,
      });

      handleDrizzleErrors(
        error,
        "PostgresRatingRepository.findManyByProductId",
      );
    }
  }

  async findManyByUserId(userId: UserId): Promise<Rating[]> {
    this.logger.debug("findManyByUserId called", { userId: userId.value });

    try {
      const ratingRows: RatingRow[] = await this.logger.measure(
        "db.query.rating.findMany",
        () =>
          this.db.query.rating.findMany({
            where: (rating, { eq }) => eq(rating.user_id, userId.value),
          }),
      );

      const ratingsToReturn = ratingRows.map(PostgresRatingMapper.toDomain);

      this.logger.debug("findManyByUserId completed", {
        ratingsCount: ratingsToReturn.length,
      });

      return ratingsToReturn;
    } catch (error) {
      this.logger.error("findManyByUserId failed", error as Error, {
        userId: userId.value,
      });

      handleDrizzleErrors(error, "PostgresRatingRepository.findManyByUserId");
    }
  }

  async save(ratingAgg: Rating, tx: TransactionClient): Promise<void> {
    this.logger.debug("save called", {
      productId: ratingAgg.productId.value,
      userId: ratingAgg.userId.value,
    });

    const db = tx as DrizzleTransactionClient;

    const ratingRow: RatingRow = PostgresRatingMapper.toRow(ratingAgg);
    // remove the created_at field so it doesn't get overwritten by the onConflict
    const { created_at, ...ratingRowToUpsert } = ratingRow;

    try {
      await this.logger.measure("db.insert(rating)", () =>
        db
          .insert(rating)
          .values(ratingRow)
          .onConflictDoUpdate({
            target: [rating.user_id, rating.product_id],
            set: ratingRowToUpsert,
          }),
      );

      this.logger.debug("save completed", {
        productId: ratingAgg.productId.value,
        userId: ratingAgg.userId.value,
      });
    } catch (error) {
      this.logger.error("save failed", error as Error, {
        productId: ratingAgg.productId.value,
        userId: ratingAgg.userId.value,
      });

      handleDrizzleErrors(error, "PostgresRatingRepository.save");
    }
  }

  async delete(
    userId: UserId,
    productId: ProductId,
    tx?: TransactionClient,
  ): Promise<void> {
    this.logger.debug("delete called", {
      userId: userId.value,
      productId: productId.value,
    });

    const db = tx as DrizzleTransactionClient;

    try {
      await this.logger.measure("db.delete(rating)", () =>
        db
          .delete(rating)
          .where(
            and(
              eq(rating.user_id, userId.value),
              eq(rating.product_id, productId.value),
            ),
          ),
      );

      this.logger.debug("delete completed", {
        userId: userId.value,
        productId: productId.value,
      });
    } catch (error) {
      this.logger.error("delete failed", error as Error, {
        userId: userId.value,
        productId: productId.value,
      });

      handleDrizzleErrors(error, "PostgresRatingRepository.delete");
    }
  }
}
