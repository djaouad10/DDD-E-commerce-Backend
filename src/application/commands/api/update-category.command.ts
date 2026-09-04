import { ValidationError } from "#/shared/errors/domain-error.js";

export class UpdateCategoryCommand {
  public name: string;

  constructor(
    public categoryId: string,
    name: string,
  ) {
    this.validate(name);

    this.name = name.toLocaleLowerCase();
  }

  validate(name: string) {
    if (name.length < 3) {
      throw new ValidationError(
        "category.name",
        "name must be at least 3 characters long",
      );
    }
  }
}
