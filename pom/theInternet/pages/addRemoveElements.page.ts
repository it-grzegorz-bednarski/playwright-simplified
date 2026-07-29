import { expect } from '@playwright/test';

import { BasePage } from '../base.page';

export class AddRemoveElementsPage extends BasePage {
  protected pageUrl = '/add_remove_elements/';

  addElementButton = this.page.getByRole('button', { name: 'Add Element' });
  deleteButtons = this.page.getByRole('button', { name: 'Delete' });

  async addAndRemoveSingleElement(): Promise<void> {
    await this.addElementButton.click();
    await expect(this.deleteButtons).toHaveCount(1);
    await this.deleteButtons.first().click();
    await expect(this.deleteButtons).toHaveCount(0);
  }
}
