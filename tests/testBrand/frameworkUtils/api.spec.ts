import { test, apiProfile, session } from '@utils/baseTest';

test.describe('DummyJSON API', { tag: ['@testBrand', '@api'] }, () => {
  apiProfile({ apiConfigKey: 'dummyjson.guest' });

  test('GET product (status + keys + matches)', async ({ api }) => {
    const res = await api.get('/products/1');

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert required JSON keys exist', async () => {
      await res.expectJsonKeys(['id', 'title', 'price', 'category', 'images']);
    });

    await test.step('Assert specific JSON key:value pairs', async () => {
      await res.expectJsonMatches({
        id: 1,
        rating: 2.56,
        category: 'beauty',
        'dimensions.width': 15.14,
      });
    });

    await test.step('Assert body contains expected text', async () => {
      await res.expectBodyContains('"id":');
      await res.expectBodyContains('"category":"beauty"');
      await res.expectBodyContains('"title":"Essence Mascara Lash Princess"');
    });
  });

  test('GET products list (array min length)', async ({ api }) => {
    const res = await api.get('/products');

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert response shape (keys)', async () => {
      await res.expectJsonKeys(['products', 'total', 'skip', 'limit']);
    });

    await test.step('Assert products array has at least 1 element', async () => {
      await res.expectArrayMinLength('products', 1);
    });
  });

  test('GET product (compare response with fixture: Exact + Contains)', async ({ api }) => {
    const res = await api.get('/products/1');

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Compare response with expected JSON fixture (Exact)', async () => {
      await res.expectJsonFixtureExact('api/dummyjson/products/getProduct1.full.expected.json', {
        '%TITLE%': 'Essence Mascara Lash Princess',
        '%CATEGORY%': 'beauty',
      });
    });

    await test.step('Compare response with expected JSON fixture (Contains)', async () => {
      await res.expectJsonFixtureContains(
        'api/dummyjson/products/getProduct1.full.partial.expected.json'
      );
    });
  });

  test('POST product (body fixture + replacements)', async ({ api }) => {
    const title = `PW-${Date.now()}`;

    const res = await api.post('/products/add', {
      bodyFixture: 'api/dummyjson/products/create.POST.json',
      replace: {
        '%TITLE%': title,
      },
    });

    await test.step('Assert status code', async () => {
      await res.expectStatus(201);
    });

    await test.step('Assert response contains expected fields (fixture contains)', async () => {
      await res.expectJsonFixtureContains('api/dummyjson/products/create.partial.expected.json', {
        '%TITLE%': title,
      });
    });

    await test.step('Assert basic keys exist', async () => {
      await res.expectJsonKeys(['id', 'title', 'price']);
    });
  });

  test('PUT product (body fixture + replacements)', async ({ api }) => {
    const title = `PW-PUT-${Date.now()}`;

    const res = await api.put('/products/1', {
      bodyFixture: 'api/dummyjson/products/update.PUT.json',
      replace: {
        '%TITLE%': title,
      },
    });

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert response contains expected fields (fixture contains)', async () => {
      await res.expectJsonFixtureContains('api/dummyjson/products/update.partial.expected.json', {
        '%TITLE%': title,
      });
    });

    await test.step('Assert basic keys exist', async () => {
      await res.expectJsonKeys(['id', 'title', 'price']);
    });
  });

  test('PATCH product (body fixture + replacements)', async ({ api }) => {
    const title = `PW-PATCH-${Date.now()}`;

    const res = await api.patch('/products/1', {
      bodyFixture: 'api/dummyjson/products/update.PATCH.json',
      replace: {
        '%TITLE%': title,
      },
    });

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert response contains expected fields (fixture contains)', async () => {
      await res.expectJsonFixtureContains('api/dummyjson/products/update.partial.expected.json', {
        '%TITLE%': title,
      });
    });

    await test.step('Assert basic keys exist', async () => {
      await res.expectJsonKeys(['id', 'title']);
    });
  });

  test('DELETE product', async ({ api }) => {
    const res = await api.delete('/products/1');

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert basic keys exist', async () => {
      await res.expectJsonKeys(['id', 'isDeleted', 'deletedOn']);
    });

    await test.step('Assert response contains expected fields (fixture contains)', async () => {
      await res.expectJsonFixtureContains('api/dummyjson/products/delete.partial.expected.json');
    });
  });
});

test.describe('DummyJSON API (auth examples)', { tag: ['@testBrand', '@api'] }, () => {
  session('ADMIN', { sessionLoginKey: 'dummyjson' });
  apiProfile({ apiConfigKey: 'dummyjson.authorized' });

  test('GET auth/me (authorized)', async ({ api }) => {
    const res = await api.get('/auth/me');

    await test.step('Assert status code', async () => {
      await res.expectStatus(200);
    });

    await test.step('Assert required keys exist', async () => {
      await res.expectJsonKeys(['id', 'username', 'email', 'firstName', 'lastName']);
    });

    await test.step('Assert body contains username', async () => {
      const username = process.env.ADMIN_USERNAME;
      if (username) {
        await res.expectBodyContains(username);
      }
    });
  });

  test('GET auth/me (missing token -> 401) [sanity]', async ({ api }) => {
    const res = await api.get('/auth/me', {
      headers: {
        Authorization: undefined,
      },
    });

    await test.step('Assert status code', async () => {
      await res.expectStatus(401);
    });
  });
});
