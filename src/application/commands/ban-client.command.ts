export class BanClientCommand {
  constructor(
    public readonly clientId: string,
    public readonly banExpiresInSeconds?: number ,
    public readonly reason?: string ,
  ) {}
}
