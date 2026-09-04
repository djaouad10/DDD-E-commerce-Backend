import { ValidationError } from "#/shared/errors/domain-error.js";

export class UpdateCategoryCommand {
  public name: string;

  constructor(
    public categoryId: string,
    name: string,
  ) {
    this.name = name.trim().toLocaleLowerCase();

    this.validate();
  }

  validate() {
    if (this.name.length < 3) {
      throw new ValidationError(
        "category.name",
        "name must be at least 3 characters long",
      );
    }
  }
}
