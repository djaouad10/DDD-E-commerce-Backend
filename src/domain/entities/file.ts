import type { DomainEvent } from "../events/domain-event.js";
import { FileId } from "../value-objects/file-id.js";

export class File {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: FileId,
    private readonly _key: string,
    private readonly _name: string,
    readonly publicUrl: string,
    private readonly isMain: boolean,
  ) {}

  // factory
  static create(
    key: string,
    name: string,
    publicUrl: string,
    isMain: boolean,
  ): File {
    return new File(FileId.generate(), key, name, publicUrl, isMain);
  }

  // reconstitute

  static reconstitute(
    id: FileId,
    key: string,
    name: string,
    publicUrl: string,
    isMain: boolean,
  ): File {
    return new File(id, key, name, publicUrl, isMain);
  }

  // command methods

  // query methods

  // event methods

  // mappers

  // private utils
}
