export class CreateCategoryCommand {
  public name: string;
  constructor(name: string) {
    this.validate(name);

    this.name = name.toLocaleLowerCase();
  }

  validate(name: string) {
    if (name.length < 3) {
      throw new Error("Category name must be at least 3 characters long");
    }
  }
}
