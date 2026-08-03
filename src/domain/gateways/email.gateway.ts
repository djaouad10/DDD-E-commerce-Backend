export type EmailGateway = {
  sendEmail(to: string, subject: string, text: string): Promise<void>;
};
