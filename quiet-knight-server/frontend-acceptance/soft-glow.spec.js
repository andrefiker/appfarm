import { test, expect } from '@playwright/test';

test('soft glow is limited to black pieces on dark squares in both orientations', async ({ page }) => {
  const url = process.env.QK_FRONTEND_URL || 'http://127.0.0.1:4182/';
  await page.route('**/capabilities', r => r.fulfill({ json: { protocol: 2, new_games: 'untimed', guest_play: true, variants: ['standard'] } }));
  await page.setViewportSize({ width: 393, height: 873 });
  await page.goto(url);
  await page.getByRole('button', { name: /Play White/ }).click();
  const board = page.locator('.board-stage .board');
  const glow = /drop-shadow\(rgb\(227, 219, 183\) 0px 0px 1px\).*drop-shadow\(rgba\(222, 214, 180, 0\.55\) 0px 0px 2\.35px\)/;
  const verify = async () => {
    await expect(board.locator('.square')).toHaveCount(64);
    await expect(board.locator('.square-dark .chess-art.art-b').first()).toHaveCSS('filter', glow);
    await expect(board.locator('.square-light .chess-art.art-b').first()).not.toHaveCSS('filter', glow);
    await expect(board.locator('.square-dark .chess-art.art-w').first()).not.toHaveCSS('filter', glow);
  };
  await verify();
  await page.screenshot({ path: 'output/playwright/soft-glow-portrait.png' });
  await page.setViewportSize({ width: 873, height: 393 });
  await verify();
  await expect(board.locator('.square').last()).toBeInViewport({ ratio: .99 });
  await page.screenshot({ path: 'output/playwright/soft-glow-landscape.png' });
});