import type { ResetStuckConvosCommand } from "#/application/commands/stuck-convos-resetter/reset-stuck-convos.command.js";
import type { ConversationRepository } from "#/application/ports/persistence/conversation.repository.js";
import { createLogger } from "#/shared/logging/logger.js";

export class ResetStuckConvosService {
  private logger = createLogger("ResetStuckConvosService");

  constructor(private conversationRepository: ConversationRepository) {}

  async execute(command: ResetStuckConvosCommand): Promise<void> {
    this.logger.info("ResetStuckConvosService.execute called", { command });

    const stuckConvos =
      await this.conversationRepository.findStuckConversations(
        command.batchSize,
        command.stuckforMs,
      );

    if (stuckConvos.length === 0) {
      this.logger.info("No stuck convos found, nothing to reset");
      return;
    }

    for (const convo of stuckConvos) {
      try {
        await this.conversationRepository.releaseConversation(convo.id);
      } catch (error) {
        // next poll cycle will try again this convo
        this.logger.error("Failed to reset stuck convo", error as Error, {
          conversationId: convo.id,
        });
        continue;
      }
    }

    this.logger.info("Reset stuck convos complete", {
      count: stuckConvos.length,
    });
  }
}
