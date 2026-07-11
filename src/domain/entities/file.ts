import type { FileSnapshot } from "#/domain/entities-snapshots/file.dto.js";
import type { DomainEvent } from "../events/domain-event.js";
import { FileId } from "../value-objects/file-id.js";

export class File {
  private _events: DomainEvent[] = [];

  private constructor(
    readonly id: FileId,
    private readonly _key: string,
    private readonly _name: string,
    readonly publicUrl: string,
    private _isMain: boolean,
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

  setIsMain(newIsMain: boolean) {
    this._isMain = newIsMain;
  }

  // query methods
  getKey(): string {
    return this._key;
  }

  getName(): string {
    return this._name;
  }

  isMain(): boolean {
    return this._isMain;
  }

  // event methods
  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  peekEvents(): readonly DomainEvent[] {
    return [...this._events];
  }

  // mappers
  toSnapshot(): FileSnapshot {
    return {
      id: this.id.value,
      name: this._name,
      publicUrl: this.publicUrl,
      isMain: this._isMain,
    };
  }

  // private utils
}
