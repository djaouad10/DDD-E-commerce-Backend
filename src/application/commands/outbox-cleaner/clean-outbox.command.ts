export class CleanOutboxCommand {
  constructor(public readonly olderThan: Date) {}
}
