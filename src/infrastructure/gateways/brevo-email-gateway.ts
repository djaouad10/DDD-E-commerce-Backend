import type { EmailGateway } from "#/domain/gateways/email.gateway.js";
import { createLogger } from "#/shared/logging/logger.js";
import { env } from "../config/env.js";
import type { HttpClient } from "../http/client/http-client.js";

export class BrevoEmailGateway implements EmailGateway {
  private logger = createLogger("BrevoEmailGateway");

  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async sendEmail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.logger.measure("sendEmail", async () => {
        this.httpClient.request({
          method: "POST",
          url: this.baseUrl,
          headers: { "api-key": this.apiKey },
          body: {
            sender: {
              name: env.EMAIL_SENDER_NAME,
              email: env.EMAIL_SENDER_ADDRESS,
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: text,
          },
        });
      });
    } catch (error) {
      this.logger.error("Failed to send email", error as Error, {
        to,
        subject,
        text,
      });

      throw error;
    }
  }
}
