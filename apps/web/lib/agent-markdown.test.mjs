// Run with: node --test apps/*/lib/*.test.mjs (Node 24 strips the .ts types).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asHtmlRequest, asMarkdown, finalize, wantsMarkdown } from './agent-markdown.ts'

const req = (accept, method = 'GET', path = '/') => new Request(`https://example.dev${path}`, { method, headers: { accept } })
const html = (status = 200) => new Response('<h1>Hi</h1>', { status, headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '11' } })
const ai = { toMarkdown: async () => [{ data: '# Hi', tokens: 3 }] }

test('wantsMarkdown matches GET with text/markdown only', () => {
  assert.equal(wantsMarkdown(req('text/markdown, text/html;q=0.9')), true)
  assert.equal(wantsMarkdown(req('text/html')), false)
  assert.equal(wantsMarkdown(req('text/markdown', 'POST')), false)
  assert.equal(asHtmlRequest(req('text/markdown')).headers.get('accept'), 'text/html')
})

test('asMarkdown converts HTML', async () => {
  const res = await asMarkdown(html(), ai)
  assert.equal(res.headers.get('content-type'), 'text/markdown; charset=utf-8')
  assert.equal(res.headers.get('x-markdown-tokens'), '3')
  assert.equal(res.headers.get('content-length'), null)
  assert.equal(await res.text(), '# Hi')
})

test('asMarkdown passes through errors, non-HTML and a missing binding', async () => {
  const notFound = html(404)
  assert.equal(await asMarkdown(notFound, ai), notFound)
  const json = new Response('{}', { headers: { 'content-type': 'application/json' } })
  assert.equal(await asMarkdown(json, ai), json)
  const page = html()
  assert.equal(await asMarkdown(page, undefined), page)
})

test('finalize adds Vary, security headers and the homepage Link', () => {
  const home = finalize(req('text/html'), html())
  assert.equal(home.headers.get('vary'), 'Accept')
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff')
  assert.match(home.headers.get('link'), /llms\.txt/)
  assert.equal(finalize(req('text/html', 'GET', '/other'), html()).headers.get('link'), null)
})
