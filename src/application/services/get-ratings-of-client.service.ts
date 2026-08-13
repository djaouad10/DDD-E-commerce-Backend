import { UserId } from "#/domain/value-objects/user-id.js";
import { createLogger } from "#/shared/logging/logger.js";
import type { RatingDTO } from "../dto/rating.dto.js";
import type { GetRatingsOfClientQuery } from "../queries/get-ratings-of-client.query.js";
import type {
  RatingCursor,
  RatingQueries,
} from "../read-models/rating.queries.js";

export class GetRatingsOfClientService {
  private logger = createLogger("GetRatingsOfClientService");

  constructor(private ratingQueries: RatingQueries) {}

  async execute(query: GetRatingsOfClientQuery): Promise<{
    ratings: RatingDTO[];
    nextCursor?: RatingCursor | undefined;
  }> {
    this.logger.info(`GetRatingsOfClientService.execute called`);
    const { clientId, limit, cursor } = query;

    return this.ratingQueries.search({
      userId: UserId.of(clientId),
      limit,
      ...(cursor && { cursor }),
    });
  }
}
