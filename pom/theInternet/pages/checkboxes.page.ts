import { BasePage } from '../base.page';

export class CheckboxesPage extends BasePage {
  protected pageUrl = '/checkboxes';

  firstCheckbox = this.page.locator('#checkboxes input').nth(0);
  secondCheckbox = this.page.locator('#checkboxes input').nth(1);

  async flipBothCheckboxes(): Promise<void> {
    await this.firstCheckbox.check();
    await this.secondCheckbox.uncheck();
  }
}
