import { DependencyResolutionError } from "#/shared/errors/domain-error.js";

/**
 * a Constructor represents any class that can be instantiated "new".
 ** the T generic means this constructor returns a T instance when called
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * a token is how we ask for a dependency
 ** it could be symbol (prefered), a class constuctor or a string (avoid for collisions possibility)
 */
export type Token<T> = string | symbol | Constructor<T>;

/**
 * a factory is a RECIPE on how to build a specific dependency
 ** it receives a scope object to resolve it's own dependencies
 ** it returns and object instance of type T
 */
export type Factory<T> = (scope: Scope) => T;

export type DependencyLifeCycle = "singleton" | "scoped" | "transient";

/**
 * a Registration is what we store about a specific dependancy.
 ** it contains the factory (RECIPE) used to instantiate this dependency
 ** it also contains the lifecycle rule of this dependency
 */
export type Registration<T> = {
  factory: Factory<T>;
  lifecycle: DependencyLifeCycle;
};

export class Container {
  private registry = new Map<symbol, Registration<any>>();

  private singletonCache = new Map<symbol, any>();

  /**
   * Register a dependency with a factory function.
   *
   * @param token The identifier (e.g., Symbol('db'))
   * @param factory The recipe: (scope) => new MyService(...)
   * @param lifecycle "singleton" (shared), "scoped" (per-request), "transient" (always new)
   * @returns this — for chaining: container.register(A).register(B)
   */
  register<T>(
    token: Token<T>,
    factory: Factory<T>,
    lifecycle: DependencyLifeCycle = "transient",
  ): this {
    const key = this.toKey(token);
    this.registry.set(key, { lifecycle, factory });
    return this;
  }

  /**
   * Register a pre-built instance as a singleton.
   * Use this for your db and redisConnection for example.
   */
  registerInstance<T>(token: Token<T>, instance: T): this {
    const key = this.toKey(token);

    this.registry.set(key, { lifecycle: "singleton", factory: () => instance });
    this.singletonCache.set(key, instance);

    return this;
  }

  /**
   * Create a child scope. Call this at the start of every request/job.
   * The scope gets its own private cache but shares the parent's registry.
   */
  createScope() {
    return new Scope(this);
  }

  /**
   * INTERNAL — called by Scope when it encounters a singleton token.
   * Checks singletonCache first. If not there, builds it using the factory.
   */
  resolveSingleton<T>(token: Token<T>): T {
    const key = this.toKey(token);

    const reg = this.registry.get(key);

    if (!reg) throw new DependencyResolutionError(key);

    // if already built and cached? return from cache
    if (this.singletonCache.has(key)) return this.singletonCache.get(key);

    // if not build it, then cache it

    // when reg.factory call scope.resolve and since this dependecy is a singelton: it will be directly redirected to the parent's resolveSingleton, so we can use a dummy singelton
    const instance = reg.factory(Scope.dummy);

    this.singletonCache.set(key, instance);

    return instance;
  }

  /**
   * INTERNAL — called by Scope to look up a token's factory.
   */
  getRegistration<T>(token: Token<T>): Registration<T> | undefined {
    return this.registry.get(this.toKey(token));
  }

  /**
   * Normalize any token to a symbol key for Map storage.
   * Symbol.for('name') always returns the SAME symbol for the same string.
   */
  private toKey<T>(token: Token<T>): symbol {
    if (typeof token === "function") {
      return Symbol.for(token.name);
    }
    return Symbol.for(String(token));
  }
}

export class Scope {
  static dummy = new Scope(null as any);

  constructor(private parent: Container) {}
}
