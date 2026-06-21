import type { UserDTO } from "#/application/dto/user.dto.js";
import { UserId } from "../value-objects/user-id.js";

export type UserRole = "ADMIN" | "CLIENT";

export class User {
  private constructor(
    readonly id: UserId,
    private _name: string,
    readonly email: string,
    readonly role: UserRole,
    private _image: string,
    readonly createdAt: Date,
    private _updatedAt: Date,
    private _banned: boolean,
    private _banReason: string | null,
    private _banExpires: Date | null,
  ) {}

  // factories
  static create(
    name: string,
    email: string,
    role: UserRole,
    image: string,
    banned: boolean,
    banReason?: string,
    banExpires?: Date,
  ): User {
    // validation then

    const now = new Date();

    return new User(
      UserId.generate(),
      name,
      email,
      role,
      image,
      now,
      now,
      banned,
      banReason ?? null,
      banExpires ?? null,
    );
  }

  static reconstitute(
    id: UserId,
    name: string,
    email: string,
    role: UserRole,
    image: string,
    banned: boolean,
    createdAt: Date,
    updatedAt: Date,
    banReason?: string,
    banExpires?: Date,
  ) {
    // reconstitute from DB, reuse the same ID
    // this is used by repository/mapper to reconstitute DB row => Domain object
    return new User(
      id,
      name,
      email,
      role,
      image,
      createdAt,
      updatedAt,
      banned,
      banReason ?? null,
      banExpires ?? null,
    );
  }

  // business commands

  updateName(newName: string): void {
    this._name = newName;
  }

  ban(banReason?: string, banExpires?: Date): void {
    this._banned = true;
    this._banReason = banReason ?? null;
    this._banExpires = banExpires ?? null;
  }

  unBan(): void {
    this._banned = false;
    this._banReason = null;
    this._banExpires = null;
  }

  // business queries
  getName(): string {
    return this._name;
  }

  getImage(): string {
    return this._image;
  }

  isBanned(): boolean {
    return this._banned;
  }

  // mappers
  toDTO(): UserDTO {
    // construct a public, serilizable, user facing object
    // can be called at http layer to make a response object
    return {
      id: this.id.value,
      role: this.role,
      email: this.email,
      name: this._name,
      image: this._image,
      banned: this._banned,
      createdAt: this.createdAt.toISOString(),
    };
  }

  // event methods
  pullEvents() {}

  peekEvents() {}

  // private utils
}
