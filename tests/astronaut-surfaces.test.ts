import { expect, test } from 'bun:test';
import { plugin } from 'bun';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { resolve } from 'node:path';

// Server-render the real pages; no browser. Stylesheets are not under test here.
plugin({
  name: 'svelte-astronaut-surfaces',
  setup(build) {
    build.onResolve({ filter: /^\$lib\// }, (args) => ({
      path: resolve(import.meta.dir, '../src/lib', args.path.slice(5)),
    }));
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    build.onLoad({ filter: /\.svelte$/ }, async (args) => ({
      contents: compile(await Bun.file(args.path).text(), {
        filename: args.path,
        generate: 'server',
      }).js.code,
      loader: 'js',
    }));
  },
});

const pages = {
  ring: (await import('../src/routes/ring/+page.svelte')).default,
  suit: (await import('../src/routes/suit/+page.svelte')).default,
  research: (await import('../src/routes/research/+page.svelte')).default,
};
const html = (page: keyof typeof pages) => render(pages[page], { props: {} }).body;

test('every astronaut screen wears the same shell as the health workspace', () => {
  for (const name of ['ring', 'suit', 'research'] as const) {
    const body = html(name);
    expect(body).toContain('astronaut-workspace');
    // The shared header: identity first, then which tool this is.
    expect(body).toContain('view-header');
    expect(body).toContain('view-identity');
  }
});

test('the simulators name the astronaut in the header and the device as the title', () => {
  const ring = html('ring');
  expect(ring).toContain('VEGA · Alex Morgan');
  expect(ring).toContain('Ring simulator');
  expect(ring).toContain('Link your ring');
  expect(ring).toContain('Link this ring');
  const suit = html('suit');
  expect(suit).toContain('VEGA · Alex Morgan');
  expect(suit).toContain('Suit simulator');
  expect(suit).toContain('Link your suit');
  expect(suit).toContain('Link this suit');
});

test('simulators drop the decorative labels of the old instrument panel', () => {
  for (const name of ['ring', 'suit'] as const) {
    const body = html(name);
    expect(body).not.toContain('crew-eyebrow');
    expect(body).not.toContain('SIMULATED TELEMETRY');
    expect(body).not.toContain('DEVICE /');
    expect(body).not.toContain('Demo tool generating simulated readings');
  }
  // The shortcut back to health replaces the old orientation paragraph.
  expect(html('ring')).toContain('href="/astronaut/vega"');
});

test('astronaut screens do not label their content as simulated', () => {
  for (const name of ['ring', 'suit', 'research'] as const) {
    expect(html(name)).not.toMatch(/simulated/i);
  }
});

test('the research replay is titled like the Tools entry that opens it', () => {
  const body = html('research');
  expect(body).toContain('<h1>Research scenarios</h1>');
  expect(body).toContain('Not saved to health records');
  expect(body).not.toContain('Change detected');
});
