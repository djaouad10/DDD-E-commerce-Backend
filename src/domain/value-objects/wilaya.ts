export class Wilaya {
  private constructor(
    public readonly code: number,
    public readonly name: string,
  ) {}

  static create(code: number, name: string): Wilaya {
    return new Wilaya(code, name);
  }

  static createMany(params: { code: number; name: string }[]): Wilaya[] {
    return params.map((param) => new Wilaya(param.code, param.name));
  }
}
