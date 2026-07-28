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


/**
 * a Registration is what we store about a specific dependancy.
 ** it contains the factory (RECIPE) used to instantiate this dependency
 ** it also contains the lifecycle rule of this dependency
 */
export type Registration<T> = {
  factory: Factory<T>;
  lifecycle: "singleton" | "scoped" | "transient";
};

export class Container {}

export class Scope {}
