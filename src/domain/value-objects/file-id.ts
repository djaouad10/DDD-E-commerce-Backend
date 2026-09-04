import { ValidationError } from "#/shared/errors/domain-error.js";

export class FileId {
  private constructor(readonly value: string) {}

  static generate(): FileId {
    return new FileId(`file_${crypto.randomUUID().replace(/-/g, "")}`);
  }

  static of(value: string): FileId {
    if (!value.match(/^file_[a-zA-Z0-9]{32}$/)) {
      throw new ValidationError("file.id", "invalid id format");
    }

    return new FileId(value);
  }

  equals(other: FileId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
