import { DependencyResolutionError } from "#/shared/errors/errors.js";
import { createLogger } from "#/shared/logging/logger.js";

/**
 * a Constructor represents any class that can be instantiated "new".
 ** the T generic means this constructor returns a T instance when called
 */
export type Constructor<T> = new (...args: any[]) => T;

export type InjectionToken<T> = symbol & {
  readonly __type?: T;
};

/**
 * a token is how we ask for a dependency
 ** it could be symbol (prefered), a class constuctor or a string (avoid for collisions possibility)
 */
export type Token<T> = InjectionToken<T> | Constructor<T>;

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
  private registry = new Map<Token<any>, Registration<any>>();

  private singletonCache = new Map<Token<any>, any>();

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
    this.registry.set(token, { lifecycle, factory });
    return this;
  }

  /**
   * Register a pre-built instance as a singleton.
   * Use this for your db and redisConnection for example.
   */
  registerInstance<T>(token: Token<T>, instance: T): this {
    this.registry.set(token, {
      lifecycle: "singleton",
      factory: () => instance,
    });
    this.singletonCache.set(token, instance);

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
    const reg = this.registry.get(token);

    if (!reg) throw new DependencyResolutionError(token);

    // if already built and cached? return from cache
    if (this.singletonCache.has(token)) return this.singletonCache.get(token);

    // if not build it, then cache it

    const instance = reg.factory(new Scope(this));

    this.singletonCache.set(token, instance);

    return instance;
  }

  /**
   * INTERNAL — called by Scope to look up a token's factory.
   */
  getRegistration<T>(token: Token<T>): Registration<T> | undefined {
    return this.registry.get(token);
  }
}

export class Scope {
  private logger = createLogger("Scope");
  private scopedCache = new Map<Token<any>, any>();

  constructor(private parent: Container) {}

  /**
   * Resolve a dependency from this scope.
   */
  resolve<T>(token: Token<T>): T {
    const reg = this.parent.getRegistration(token);

    if (!reg) throw new DependencyResolutionError(token);

    if (reg.lifecycle === "singleton") {
      return this.parent.resolveSingleton(token);
    }

    if (reg.lifecycle === "scoped") {
      // check scope cache first, if built and cached return it from cache
      if (this.scopedCache.has(token)) return this.scopedCache.get(token);

      // if not in cache, build and cache
      const instance = reg.factory(this);

      this.scopedCache.set(token, instance);

      return instance;
    }

    // if reg.lifecycle === "transient"
    return reg.factory(this);
  }

  /**
   * Dispose this scope. Call this after every request or job finishes.
   * Iterates scoped instances and calls their dispose() if they have one.
   * Does NOT touch singletons.
   */
  async dispose(): Promise<void> {
    const instances = [...this.scopedCache.values()];
    this.scopedCache.clear(); // clear FIRST: even if everything explodes, the scope is dead

    for (const instance of instances) {
      if (isDisposable(instance)) {
        try {
          await instance.dispose();
        } catch (err) {
          this.logger.error("Error while disposing scope", err as Error);
        }
      }
    }
  }
}

export interface Disposable {
  dispose(): Promise<void> | void;
}

function isDisposable(x: unknown): x is Disposable {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Disposable).dispose === "function"
  );
}
