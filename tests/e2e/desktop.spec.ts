import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

let pageErrors: string[] = [];
test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

async function openApp(page: Page, name: string) {
  await page.getByRole('button', { name: 'Open Start menu', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search apps and files' }).fill(name);
  await page
    .locator('.search-app-results')
    .getByRole('button', { name: new RegExp(name) })
    .first()
    .click();
  await expect(page.getByRole('region', { name: `${name} window`, exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  // Live weather is optional. A deterministic failure exercises the offline fallback.
  await page.route('**/api/weather?**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Weather is unavailable while offline.' }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome home.' })).toBeVisible();
});

test('desktop, shell controls, dragging, maximize and minimize', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const explorer = page.getByRole('region', { name: 'File Explorer window' });
  const old = await explorer.boundingBox();
  const title = explorer.locator('.window-titlebar');
  const rect = (await title.boundingBox())!;
  await page.mouse.move(rect.x + 230, rect.y + 18);
  await page.mouse.down();
  await page.mouse.move(rect.x + 265, rect.y + 54, { steps: 8 });
  await page.mouse.up();
  expect((await explorer.boundingBox())!.x).toBeGreaterThan(old!.x + 20);
  await page.getByRole('button', { name: 'Maximize File Explorer' }).click();
  await expect(explorer).toHaveClass(/is-maximized/);
  await page.getByRole('button', { name: 'Maximize File Explorer' }).click();
  await expect(explorer).not.toHaveClass(/is-maximized/);
  await page.getByRole('button', { name: 'Minimize File Explorer' }).click();
  await expect(explorer).not.toBeVisible();
  await page.getByRole('button', { name: 'Open File Explorer', exact: true }).click();
  await expect(explorer).toBeVisible();
  await page.getByRole('button', { name: 'Show desktop', exact: true }).click();
  await expect(explorer).not.toBeVisible();
  await page.getByRole('button', { name: 'Show desktop', exact: true }).click();
  await expect(explorer).toBeVisible();
  expect(errors).toEqual([]);
});

test('create, rename, trash and restore a folder', async ({ page }) => {
  await page
    .locator('.sidebar-navigation')
    .getByRole('button', { name: 'My files', exact: true })
    .click();
  await page.getByRole('button', { name: 'New folder', exact: true }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('My creative space');
  await page.getByRole('button', { name: 'Create folder', exact: true }).click();
  await expect(page.locator('.file-table')).toContainText('My creative space');
  await page.getByRole('button', { name: 'Actions for My creative space' }).click();
  await page.locator('.file-context').getByRole('button', { name: 'Rename' }).click();
  await page.getByRole('dialog').getByRole('textbox').fill('A better name');
  await page.getByRole('dialog').getByRole('button', { name: 'Rename' }).click();
  await expect(page.locator('.file-table')).toContainText('A better name');
  await page.getByRole('button', { name: 'Actions for A better name' }).click();
  await page
    .locator('.file-context')
    .getByRole('button', { name: /Move to Recycle Bin/ })
    .click();
  await expect(page.locator('.file-table')).not.toContainText('A better name');
  await page
    .locator('.sidebar-navigation')
    .getByRole('button', { name: /Recycle Bin/ })
    .click();
  await page.getByRole('button', { name: 'Actions for A better name' }).click();
  await page.locator('.file-context').getByRole('button', { name: 'Restore', exact: true }).click();
  await page
    .locator('.sidebar-navigation')
    .getByRole('button', { name: 'My files', exact: true })
    .click();
  await expect(page.locator('.file-table')).toContainText('A better name');
  await page.reload();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('wr:files')!).some(
        (f: { name: string; trashed: boolean }) => f.name === 'A better name' && !f.trashed,
      ),
    ),
  ).toBe(true);
});

test('notes really edit, preview and survive reloads', async ({ page }) => {
  await openApp(page, 'Notes');
  await page.getByRole('button', { name: 'New note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note title' }).fill('My first thought');
  await page
    .getByRole('textbox', { name: 'Note content' })
    .fill('# Hello, Window React\n\nA beautiful new beginning.');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.locator('.markdown-preview h1')).toHaveText('Hello, Window React');
  await page.reload();
  await openApp(page, 'Notes');
  await expect(page.getByRole('textbox', { name: 'Note title' })).toHaveValue('My first thought');
  await expect(page.getByRole('textbox', { name: 'Note content' })).toHaveValue(
    /A beautiful new beginning/,
  );
});

test('terminal opens a real shell on the Node.js host and runs npm', async ({ page }) => {
  await openApp(page, 'Terminal');
  const terminal = page.getByRole('region', { name: 'Terminal window', exact: true });
  const status = terminal.locator('.terminal-status-state');
  await expect(status).toContainText(/Real .* on/, { timeout: 30_000 });
  await expect(terminal.locator('.xterm-screen')).toBeVisible();
  // Keystrokes go to a real PTY; the shell echoes them and runs the command.
  await terminal.locator('.xterm-helper-textarea').focus();
  await page.keyboard.type('echo wr-$((6*7)) && npm --version');
  await page.keyboard.press('Enter');
  // xterm may paint on a canvas (WebGL) or in the DOM, so the output is verified through the
  // find bar, which searches the real terminal buffer either way. The typed command line contains
  // "wr-$((6*7))", so the only "wr-42" is the echoed output.
  const count = terminal.locator('.shell-search-count');
  await terminal.getByRole('button', { name: 'Find in terminal' }).click();
  const find = terminal.getByRole('textbox', { name: 'Find in terminal' });
  await find.fill('wr-42');
  await expect(count).toContainText('1 of 1', { timeout: 15_000 });
  // npm prints its version on a line of its own (the regex may also match a prompt line).
  await terminal.getByRole('button', { name: 'Use regular expression' }).click();
  await find.fill('^\\d+\\.\\d+\\.\\d+$');
  await expect(count).toContainText(/^1 of \d+$/, { timeout: 60_000 });
  await page.keyboard.press('Escape');
  await expect(terminal.locator('.shell-search')).toHaveCount(0);
  // Exiting the shell is reported, and Enter starts a fresh one.
  await terminal.locator('.xterm-helper-textarea').focus();
  await page.keyboard.type('exit 3');
  await page.keyboard.press('Enter');
  await expect(status).toContainText('exited with code 3', { timeout: 15_000 });
  await page.keyboard.press('Enter');
  await expect(status).toContainText(/Real .* on/, { timeout: 30_000 });
});

test('a crashing app window never takes the desktop down', async ({ page }) => {
  await openApp(page, 'Terminal');
  const terminal = page.getByRole('region', { name: 'Terminal window', exact: true });
  await expect(terminal.locator('.terminal-status-state')).toContainText(/Real .* on/, {
    timeout: 30_000,
  });
  // An unfinished regular expression used to throw straight out of React's event handler.
  await terminal.getByRole('button', { name: 'Find in terminal' }).click();
  await terminal.getByRole('button', { name: 'Use regular expression' }).click();
  await terminal.getByRole('textbox', { name: 'Find in terminal' }).fill('wr-(');
  await expect(terminal.locator('.shell-search-count')).toHaveText('Invalid pattern');
  await page.keyboard.press('Escape');
  // A render error inside one app is contained by that window's boundary.
  await page.evaluate(() => {
    localStorage.setItem('wr:terminal-font', '"not a number"');
    localStorage.setItem('wr:terminal-shell', JSON.stringify({ nested: true }));
  });
  await page.reload();
  await openApp(page, 'Terminal');
  await expect(terminal.locator('.terminal-zoom b')).toHaveText('13');
  await expect(terminal.locator('.terminal-status-state')).toContainText(/Real .* on/, {
    timeout: 30_000,
  });
  await expect(page.locator('.recovery-screen')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Start menu', exact: true })).toBeVisible();
});

test('terminal keeps the safe workspace shell as a tab', async ({ page }) => {
  await openApp(page, 'Terminal');
  const terminal = page.getByRole('region', { name: 'Terminal window', exact: true });
  await terminal.getByRole('button', { name: 'Choose a shell' }).click();
  await terminal.getByRole('menuitem', { name: /Workspace shell/ }).click();
  await expect(terminal.getByRole('tab')).toHaveCount(2);
  const command = page.getByRole('textbox', { name: 'Terminal command' });
  await command.fill('mkdir "Terminal ideas"');
  await command.press('Enter');
  await expect(page.locator('.terminal-scroll')).toContainText('Created Terminal ideas');
  await command.fill('cd "Terminal ideas"');
  await command.press('Enter');
  await command.fill('echo "Hello from the shell" > note.txt');
  await command.press('Enter');
  await command.fill('cat note.txt');
  await command.press('Enter');
  await expect(page.locator('.terminal-line.output').last()).toHaveText('Hello from the shell');
  await command.fill('calc (2+3)*7');
  await command.press('Enter');
  await expect(page.locator('.terminal-line.output').last()).toHaveText('35');
  await command.fill('calc process.exit()');
  await command.press('Enter');
  await expect(page.locator('.terminal-line.error').last()).toHaveText('Invalid expression');
  // Host commands are not interpreted by the virtual shell.
  await command.fill('node -e "process.exit(1)"');
  await command.press('Enter');
  await expect(page.locator('.terminal-line.error').last()).toContainText(
    'not a workspace command',
  );
  await command.fill('sysinfo');
  await command.press('Enter');
  await expect(page.locator('.terminal-line.output').last()).toContainText('Node.js');
  // Closing the tab returns to the real shell.
  await terminal.getByRole('tab', { name: 'Workspace shell' }).getByRole('button').click();
  await expect(terminal.getByRole('tab')).toHaveCount(1);
});

test('personalization changes theme, wallpaper and profile persistently', async ({ page }) => {
  await page.getByRole('button', { name: 'Make it yours', exact: true }).click();
  await page.getByRole('button', { name: 'Coastal hour', exact: true }).click();
  await expect(page.locator('.desktop')).toHaveCSS('background-image', /dusk.jpg/);
  await page
    .locator('.settings-sidebar')
    .getByRole('button', { name: 'Appearance', exact: true })
    .click();
  await page.getByRole('button', { name: 'A quieter evening' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('switch', { name: 'Animations' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-animations', 'false');
  await page.locator('.settings-sidebar').getByRole('button', { name: 'Your profile' }).click();
  await page.getByRole('textbox', { name: 'What should we call you?' }).fill('Minh');
  await page.getByRole('button', { name: 'Save your name' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.sidebar-account')).toContainText('Minh');
  await expect(page.locator('.desktop')).toHaveCSS('background-image', /dusk.jpg/);
});

test('calculator, memory and keyboard input', async ({ page }) => {
  await openApp(page, 'Calculator');
  await page.keyboard.type('12+3');
  await page.keyboard.press('Enter');
  await expect(page.locator('.calculator-display output')).toHaveText('15');
  await page.getByRole('button', { name: 'MS', exact: true }).click();
  await page.getByRole('button', { name: 'C', exact: true }).click();
  await page.getByRole('button', { name: 'MR', exact: true }).click();
  await expect(page.locator('.calculator-display output')).toHaveText('15');
  await page.getByRole('button', { name: 'Calculation history' }).click();
  await expect(page.locator('.calculation-list')).toContainText('12+3');
});

test('music is real playable audio, with seeking and favorites', async ({ page }) => {
  await openApp(page, 'Music');
  await page.getByRole('button', { name: 'Play music', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause music', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('audio').evaluate((el: HTMLAudioElement) => el.currentTime))
    .toBeGreaterThan(0.3);
  await page.getByRole('button', { name: 'Next track' }).click();
  await expect(page.locator('.now-playing')).toContainText('Somewhere, softer');
  await page.getByRole('button', { name: 'Favorite this track', exact: true }).click();
  await page.locator('.music-nav').getByRole('button', { name: 'Favorites' }).click();
  await expect(page.locator('.track-list .track-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause music', exact: true }).click();
  await expect
    .poll(() => page.locator('audio').evaluate((el: HTMLAudioElement) => el.paused))
    .toBe(true);
});

test('calendar saves events and navigates months', async ({ page }) => {
  await openApp(page, 'Calendar');
  const month = await page.locator('.month-heading h2').textContent();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.locator('.month-heading h2')).not.toHaveText(month!);
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: 'Add calendar event' }).click();
  await page.getByRole('textbox', { name: 'Event title' }).fill('A little creative time');
  await page.getByRole('button', { name: 'Add to your day' }).click();
  await expect(page.locator('.agenda-events')).toContainText('A little creative time');
  await page.reload();
  await openApp(page, 'Calendar');
  await expect(page.locator('.agenda-events')).toContainText('A little creative time');
  await page.getByRole('button', { name: 'Delete event A little creative time' }).click();
  await expect(page.locator('.agenda-events')).not.toContainText('A little creative time');
});

test('photo gallery, actual image view, zoom and wallpaper', async ({ page }) => {
  await openApp(page, 'Photos');
  await page.locator('.photo-card').nth(1).click();
  await expect(page.locator('.photo-canvas > img')).toHaveAttribute('src', '/wallpapers/dusk.jpg');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.zoom-label')).toHaveText('125%');
  await page.getByRole('button', { name: 'Set as wallpaper', exact: true }).click();
  await expect(page.locator('.desktop')).toHaveCSS('background-image', /dusk.jpg/);
  await page.getByRole('button', { name: 'Back to all photos', exact: true }).click();
  await expect(page.locator('.photo-card')).toHaveCount(3);
});

test('browser tabs and unsupported protocol protection', async ({ page }) => {
  await openApp(page, 'Browser');
  await page.getByRole('button', { name: 'New browser tab' }).click();
  await expect(page.locator('.browser-tab')).toHaveCount(2);
  await page.getByRole('textbox', { name: 'Website address' }).fill('javascript:alert(1)');
  await page.getByRole('textbox', { name: 'Website address' }).press('Enter');
  await expect(page.locator('.browser-newtab')).toBeVisible();
  await expect(page.locator('.toast-stack')).toContainText('That address can’t be opened');
  await page
    .locator('.browser-tab.active')
    .getByRole('button', { name: 'Close browser tab' })
    .click();
  await expect(page.locator('.browser-tab')).toHaveCount(1);
});

test('focus timer, task list, quick settings and weather fallback', async ({ page }) => {
  await openApp(page, 'Focus');
  await page.getByRole('button', { name: 'Short break', exact: true }).click();
  await expect(page.locator('.focus-timer > div > span')).toHaveText('5:00');
  await page.getByRole('button', { name: 'Take a breath', exact: true }).click();
  await expect(page.locator('.focus-timer > div > span')).not.toHaveText('5:00', { timeout: 5000 });
  await page.getByRole('button', { name: 'A little pause', exact: true }).click();
  await page.getByRole('button', { name: 'Add focus task' }).click();
  await page.getByRole('textbox', { name: 'Focus task' }).fill('Ship a lovely project');
  await page.getByRole('textbox', { name: 'Focus task' }).press('Enter');
  await page.getByRole('button', { name: 'Complete Ship a lovely project' }).click();
  await expect(page.locator('.focus-task.done')).toContainText('Ship a lovely project');
  await page.getByRole('button', { name: 'Open quick settings' }).click();
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Close quick settings' }).click();
  await openApp(page, 'Weather');
  await expect(
    page.getByRole('heading', { name: 'The sky’s a little out of reach.' }),
  ).toBeVisible();
});

test('compact desktop works without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome home.' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await page.getByRole('button', { name: 'Open Start menu', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Start menu' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search apps and files' }).fill('Calculator');
  await page.locator('.search-app-results').getByRole('button').first().click();
  await page.getByRole('button', { name: '7', exact: true }).click();
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.getByRole('button', { name: 'Equals', exact: true }).click();
  await expect(page.locator('.calculator-display output')).toHaveText('10');
});

test('upload and download a real local text file', async ({ page }) => {
  await page
    .locator('.sidebar-navigation')
    .getByRole('button', { name: 'Downloads', exact: true })
    .click();
  await page.locator('.explorer-app input[type="file"]').setInputFiles({
    name: 'from-my-device.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('A real file, in a little web desktop.'),
  });
  await expect(page.locator('.file-table')).toContainText('from-my-device.txt');
  await page.getByRole('button', { name: 'Actions for from-my-device.txt', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page
    .locator('.file-context')
    .getByRole('button', { name: 'Download', exact: true })
    .click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('from-my-device.txt');
  expect(await readFile((await file.path())!, 'utf8')).toBe(
    'A real file, in a little web desktop.',
  );
});

test('workspace backup is downloadable, validated and restorable', async ({ page }) => {
  await openApp(page, 'Settings');
  await page.getByRole('button', { name: 'System & storage', exact: true }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export workspace', exact: true }).click();
  const file = await downloaded;
  const backup = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(backup.app).toBe('Window React');
  expect(backup.files.length).toBeGreaterThan(10);
  backup.files.push({
    id: 'restored-file',
    name: 'Restored thought.txt',
    kind: 'text',
    parentId: 'documents',
    content: 'Safe and sound.',
    size: 15,
    modified: Date.now(),
  });
  await page.locator('.settings-app input[accept="application/json,.json"]').setInputFiles({
    name: 'workspace.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Restore backup' }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('wr:files')))
    .toContain('Restored thought.txt');
  const before = await page.evaluate(() => localStorage.getItem('wr:files'));
  await page.locator('.settings-app input[accept="application/json,.json"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"files":[{"name":"invalid"}]}'),
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Restore backup' }).click();
  await expect(page.locator('.toast-stack')).toContainText('This backup doesn’t look quite right');
  expect(await page.evaluate(() => localStorage.getItem('wr:files'))).toBe(before);
});

test('snapping, resizing and keyboard search', async ({ page }) => {
  const explorer = page.getByRole('region', { name: 'File Explorer window', exact: true });
  const rect = (await explorer.locator('.window-titlebar').boundingBox())!;
  await page.mouse.move(rect.x + 230, rect.y + 18);
  await page.mouse.down();
  await page.mouse.move(4, 220, { steps: 12 });
  await expect(page.locator('.snap-left')).toBeVisible();
  await page.mouse.up();
  await expect.poll(async () => (await explorer.boundingBox())!.width).toBe(708);
  const original = (await explorer.boundingBox())!;
  const handle = (await explorer.locator('.resize-se').boundingBox())!;
  await page.mouse.move(handle.x + 4, handle.y + 4);
  await page.mouse.down();
  await page.mouse.move(handle.x + 55, handle.y - 90, { steps: 8 });
  await page.mouse.up();
  expect((await explorer.boundingBox())!.width).toBeGreaterThan(original.width);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: 'Search apps and files' })).toBeFocused();
  await page.keyboard.type('terminal');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'Terminal window', exact: true })).toBeVisible();
});

test('Node.js serves health, real system metadata and bundled audio range requests', async ({
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect((await health.json()).status).toBe('ok');
  const system = await request.get('/api/system');
  const info = await system.json();
  expect(info.runtime).toMatch(/^Node\.js \d+\.\d+\.\d+$/);
  expect(info.memory.used).toBeGreaterThan(0);
  const audio = await request.get('/audio/slow-mornings.wav', { headers: { Range: 'bytes=0-43' } });
  expect(audio.status()).toBe(206);
  expect((await audio.body()).subarray(0, 4).toString()).toBe('RIFF');
  const missing = await request.get('/api/not-real');
  expect(missing.status()).toBe(404);
});
