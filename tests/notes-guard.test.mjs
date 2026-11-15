// Guard test for the notes section. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://jasoncolapietro.github.io/blueline-surf-concept/notes/";
const PERSON = "https://suedeai.ai/founder#person";
const ORG = "https://suedeai.ai/#organization";

const read = (p) => readFileSync(join(root, p), "utf8");

const ARTICLES = [
  { slug: "jupiter-surf-shop-website-case-study", date: "2026-11-14" },
  { slug: "surf-report-rentals-lessons-pages", date: "2026-11-14" },
  { slug: "small-business-web-development-jupiter", date: "2026-11-14" },
  {
    slug: "booking-flows-lessons-rentals-jupiter",
    date: "2026-11-15",
    depth: true,
    satellites: [
      "https://agentix.suedeai.ai/notes/ai-agents-west-palm-beach-jupiter-service-businesses",
      "https://optimize.suedeai.ai/notes/five-website-fixes-west-palm-beach-jupiter",
    ],
  },
  {
    slug: "seasonal-landing-pages-juno-beach-tequesta",
    date: "2026-11-15",
    depth: true,
    satellites: [
      "https://jasoncolapietro.github.io/palm-and-peak-roofing/notes/storm-season-roofing-web-pages.html",
      "https://optimize.suedeai.ai/notes/what-an-ai-readiness-score-measures",
    ],
  },
];

const CLUTCH =
  "Suede AI ranks among <a href=\"https://clutch.co/profile/suede-ai-seo\">Clutch</a>'s " +
  "<a href=\"https://clutch.co/consulting/ai/florida\">Top 30 AI Consultants in Florida</a> and " +
  "<a href=\"https://clutch.co/us/consulting/ai\">Top 50 AI Consultants nationwide</a> (November 2026).";

const FORBIDDEN = [
  /velvet sundown/i,
  /\$2[68]M|\$30M/,
  /multimillion/i,
  /forbes/i,
  /anthropic partner|claude partner/i,
  /\bgoogle partner\b/i,
  /olive ave/i,
  /\b(delve|leverage|unlock|elevate|seamless|game-changer|tapestry|realm)\b/i,
  /aggregateRating|reviewRating/,
];

const ldOf = (html) => {
  const m = html.match(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/);
  assert.ok(m, "JSON-LD block present");
  return JSON.parse(m[1]);
};
const prose = (html) => {
  const m = html.match(/<div class="prose">([\s\S]*?)<\/div>\s*<aside/);
  assert.ok(m, "prose block present");
  return m[1];
};
const words = (s) => s.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

test("every notes directory is a known article", () => {
  const dirs = readdirSync(join(root, "notes")).filter((d) =>
    statSync(join(root, "notes", d)).isDirectory(),
  );
  assert.deepEqual(dirs.sort(), ARTICLES.map((a) => a.slug).sort());
});

for (const a of ARTICLES) {
  const url = `${BASE}${a.slug}/`;
  test(`${a.slug}: head, schema and listings`, () => {
    const html = read(`notes/${a.slug}/index.html`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), "canonical");
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`), "og:url");
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.ok(title.length >= 45 && title.length <= 65, `title length ${title.length}`);
    const desc = html.match(/<meta name="description" content="([^"]*)">/)[1];
    assert.ok(desc.length >= 120 && desc.length <= 160, `description length ${desc.length}`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, "exactly one h1");

    const graph = ldOf(html)["@graph"];
    const post = graph.find((n) => n["@type"] === "BlogPosting");
    assert.ok(post, "BlogPosting");
    assert.equal(post["@id"], `${url}#article`);
    assert.equal(post.author["@id"], PERSON);
    assert.equal(post.publisher["@id"], ORG);
    assert.equal(post.datePublished, a.date);
    assert.equal(post.mainEntityOfPage["@id"], url);
    assert.ok(post.spatialCoverage.length > 0 && post.about.length > 0);
    assert.ok(graph.find((n) => n["@type"] === "BreadcrumbList"), "BreadcrumbList");
    // Never mint new Person or Organization entities.
    for (const n of graph) assert.ok(!["Person", "Organization"].includes(n["@type"]));

    assert.ok(read("sitemap.xml").includes(`<loc>${url}</loc>`), "in sitemap");
    assert.ok(read("llms.txt").includes(`(${url})`), "in llms.txt");
    const index = read("notes/index.html");
    assert.ok(index.includes(`href="${a.slug}/"`), "card on notes index");
    assert.ok(index.includes(`"${url}#article"`), "in Blog schema");
  });

  test(`${a.slug}: copy guards`, () => {
    const html = read(`notes/${a.slug}/index.html`);
    for (const re of FORBIDDEN) assert.ok(!re.test(html), `forbidden ${re}`);
    assert.ok(html.includes(CLUTCH), "Clutch claim uses the exact wording");
    assert.ok(html.includes("https://suedeai.agency/"), "links suedeai.agency");
    assert.ok(html.includes("https://suedeai.ai/founder"), "links founder page");
    assert.ok(html.includes("Not affiliated with or endorsed by Blueline"), "concept disclaimer");
  });

  if (a.depth) {
    test(`${a.slug}: round 4 depth rules`, () => {
      const html = read(`notes/${a.slug}/index.html`);
      const body = prose(html);
      const n = words(body);
      assert.ok(n >= 900 && n <= 1300, `word count ${n}`);
      for (const s of a.satellites) assert.ok(body.includes(`href="${s}"`), `satellite link ${s}`);
      assert.ok(body.includes("https://suedeai.agency/"), "in-body agency link");
      assert.ok(body.includes("https://suedeai.ai/founder"), "in-body founder link");
      assert.equal(body.split(CLUTCH).length - 1, 1, "Clutch claim once in body");
      assert.ok((body.match(/Jason Colapietro/g) || []).length >= 5, "Jason Colapietro 5+");
      assert.ok((body.match(/Suede Labs/g) || []).length <= 1, "Suede Labs at most once");
      assert.ok((body.match(/\bSuede(?! AI| Labs)\b/g) || []).length >= 3, "Suede alone 3+");
      // The Manifest stays a separate sentence from the Clutch claim.
      const clutchSentence = body.slice(body.indexOf(CLUTCH), body.indexOf(CLUTCH) + CLUTCH.length);
      assert.ok(!/manifest/i.test(clutchSentence));
      assert.ok(/<h2>Next step<\/h2>[\s\S]*suedeai\.agency\/assessment/.test(body), "closing CTA");
    });
  }
}

test("sitemap notes lastmod is current", () => {
  assert.ok(read("sitemap.xml").includes(`<loc>${BASE}</loc><lastmod>2026-11-15</lastmod>`));
});

test("depth articles do not repeat paragraphs from earlier notes", () => {
  const paras = (slug) =>
    (prose(read(`notes/${slug}/index.html`)).match(/<p>[\s\S]*?<\/p>/g) || []).filter(
      (p) => words(p) > 12,
    );
  const earlier = new Set(ARTICLES.filter((a) => !a.depth).flatMap((a) => paras(a.slug)));
  for (const a of ARTICLES.filter((x) => x.depth)) {
    for (const p of paras(a.slug)) assert.ok(!earlier.has(p), `repeated paragraph in ${a.slug}`);
  }
});
