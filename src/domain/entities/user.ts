import type { UserSnapshot } from "#/application/dto/user.dto.js";
import type { DomainEvent } from "../events/domain-event.js";
import { UserBanned } from "../events/user/user-banned.js";
import { UserProfileUpdated } from "../events/user/user-profile-updated.js";
import { UserRegistered } from "../events/user/user-registered.js";
import { UserUnBanned } from "../events/user/user-unbanned.js";
import { UserId } from "../value-objects/user-id.js";

export const UserRole = {
  ADMIN: "ADMIN",
  CLIENT: "CLIENT",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export class User {
  private _events: DomainEvent[] = [];
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

    const user = new User(
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

    // record events
    user.recordThat(new UserRegistered(user.id.value, email, name, role));

    return user;
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

    this._updatedAt = new Date();

    // record events
    this.recordThat(new UserProfileUpdated(this.id.value, ["name"]));
  }

  updateImage(newImage: string): void {
    this._image = newImage;
    this._updatedAt = new Date();

    // record events
    this.recordThat(new UserProfileUpdated(this.id.value, ["image"]));
  }

  ban(banReason?: string, banExpires?: Date): void {
    this._banned = true;
    this._banReason = banReason ?? null;
    this._banExpires = banExpires ?? null;

    this._updatedAt = new Date();

    // record events
    this.recordThat(
      new UserBanned(
        this.id.value,
        this._banReason,
        this._banExpires?.toISOString() ?? null,
      ),
    );
  }

  unBan(): void {
    this._banned = false;
    this._banReason = null;
    this._banExpires = null;

    this._updatedAt = new Date();

    // record events
    this.recordThat(new UserUnBanned(this.id.value));
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
  toSnapshot(): UserSnapshot {
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
  pullEvents(): DomainEvent[] {
    const events = [...this._events];
    this._events = [];
    return events;
  }

  peekEvents(): readonly DomainEvent[] {
    return [...this._events];
  }

  recordThat(event: DomainEvent): void {
    this._events.push(event);
  }

  // private utils
}
