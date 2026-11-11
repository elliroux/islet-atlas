import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { jsonNews, rssNews, normalizeNews, newsSources, canonicalNewsUrl, refreshNews } from '../research/news-import.ts';
const now = new Date('2026-11-11T12:00:00Z');
const source = newsSources[0];
const article = { title: 'New type 1 diabetes research trial', date: '2026-11-10', url: source.url + '../news-article/test/', description: 'Scientists test immune therapy.' };
const valid = { ...article, url: 'https://medicine.yale.edu/news-article/test/' };
test('source dates, relevance, and exact source hosts are required', () => {
  assert.equal(normalizeNews(valid, source, now).published, '2026-11-10');
  for (const overrides of [{date:'2027-01-01'}, {date:'2020-01-01'}, {date:'no date'}, {url:'https://medicine.yale.edu.evil.test/news-article/test'}, {url:'javascript:alert(1)'}, {title:'Type 2 diabetes research',description:'A study of type 2 diabetes.'}, {title:'Type 1 diabetes fundraising marathon'}]) assert.equal(normalizeNews({...valid,...overrides},source,now),null);
});
test('canonical links deduplicate tracking parameters', () => {
  assert.equal(canonicalNewsUrl(valid.url+'?utm_source=x#fragment'), canonicalNewsUrl(valid.url));
  assert.equal(canonicalNewsUrl('https://user:secret@medicine.yale.edu/news-article/test'), null);
});
test('structured data supports nested graphs and skips executable or malformed scripts', () => {
  const body = '<script>alert(1)</script><script type="application/ld+json">'+JSON.stringify({'@graph':[{headline:valid.title,datePublished:valid.date,url:valid.url}]})+'</script>';
  assert.equal(jsonNews(body)[0].title, valid.title);
});
test('RSS handles CDATA and entities without external entity processing', () => {
  const xml='<rss><channel><item><title><![CDATA[Type 1 research &amp; cells]]></title><link>'+valid.url+'</link><pubDate>Tue, 10 Nov 2026 12:00:00 GMT</pubDate><description>New study</description></item></channel></rss>';
  assert.equal(rssNews(xml)[0].title,'Type 1 research & cells');
  assert.throws(()=>rssNews('<!DOCTYPE rss><rss/>'));
});
function database() {
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../drizzle/0002_news_feed.sql', import.meta.url),'utf8'));
  const db = {
    prepare(sql) {
      return { bind(...values) { return { async run() {
        const result = sqlite.prepare(sql).run(...values);
        return { meta: { changes: Number(result.changes) } };
      } }; } };
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  return {sqlite,db};
}
test('scheduled imports are idempotent and preserve existing stories on provider failure', async t => {
  const {sqlite,db}=database();
  const date=new Date().toISOString().slice(0,10);
  let fail=false;
  t.mock.method(globalThis,'fetch',async url=>{
    if(fail) return new Response('Unavailable',{status:503});
    if(String(url).includes('harvard')) return new Response(`<rss><channel><item><title>Type 1 diabetes research trial</title><link>https://news.harvard.edu/gazette/story/2026/11/test/</link><pubDate>${date}</pubDate></item></channel></rss>`);
    if(String(url).endsWith('/news-and-views')) return new Response('<a href="/about-us/news-and-views/test">Research</a>');
    return new Response('<script type="application/ld+json">'+JSON.stringify({headline:valid.title,datePublished:date,url:String(url).includes('diabetes.org')?'https://www.diabetes.org.uk/about-us/news-and-views/test':valid.url})+'</script>');
  });
  await refreshNews(db);await refreshNews(db);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM news_items').get().count,3);
  fail=true;await assert.rejects(refreshNews(db));
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM news_items').get().count,3);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM news_sources WHERE error IS NOT NULL AND last_success IS NOT NULL').get().count,3);
});
