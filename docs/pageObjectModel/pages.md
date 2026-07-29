# Pages

← [Back to main documentation](../../README.md)
↑ [Back to Page Object Model](./index.md)

## Overview

Pages are concrete screen objects for domain routes.

---

## Configuration

### Static pages (require)

```ts
import { BasePage } from '../base.page';

export class HomePage extends BasePage {
  protected pageUrl = '/';
}
```

### Dynamic pages (require)

```ts
import { BasePage } from '../base.page';

export class ProductPage extends BasePage {
  protected pageUrl = '/products';

  async gotoById(productId: string) {
    await this.page.goto(`${this.pageUrl}/${productId}`);
  }
}
```

---

## Usage

```ts
await homePage.goto();
await productPage.gotoById('123');
```
