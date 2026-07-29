import { test } from '@pom/theInternet/pageFixture';
import percySnapshot from '@utils/percy';
import replaceText from '@utils/replaceText';

test.describe('visual - testBrand', { tag: ['@testBrand', '@visual'] }, () => {
  test('homePage visual snapshot', async ({ homePage, page }) => {
    await homePage.goto();
    await replaceText(page,'h1', 'Different test text')
    await percySnapshot(page, 'HomePage');
  });
});
