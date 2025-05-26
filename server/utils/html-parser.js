import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";

function extractMetadataFromHTML(rawHTML, finalUrl) {
  // Pre-process HTML to remove problematic CSS
  const cleanedHTML = rawHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  const dom = new JSDOM(cleanedHTML, {
    url: finalUrl,
    features: {
      css: false,
      FetchExternalResources: false,
      ProcessExternalResources: false,
    },
    runScripts: "outside-only",
  });
  const doc = dom.window.document;
  const $ = cheerio.load(cleanedHTML);

  const readable = new Readability(doc).parse();

  // Utility to get meta content by name or property
  const getMeta = (name) =>
    $(`meta[name="${name}"]`).attr("content") ||
    $(`meta[property="${name}"]`).attr("content") ||
    null;

  // Try to find author in common meta tags and page elements
  const author =
    getMeta("author") ||
    getMeta("article:author") ||
    getMeta("og:article:author") ||
    getMeta("twitter:creator") ||
    $('a[rel="author"]').text().trim() ||
    $('[itemprop="author"]').text().trim() ||
    $('[class*="author"]').first().text().trim() ||
    null;

  // Extract main image
  const mainImage =
    getMeta("og:image") || // Open Graph image
    getMeta("twitter:image") || // Twitter card image
    getMeta("image") || // Generic image meta
    (() => {
      // fallback: pick first large <img> inside the article content
      if (readable?.content) {
        const content$ = cheerio.load(readable.content);
        const imgs = content$("img").toArray();

        // Filter images by size or dimension if you want (optional)
        if (imgs.length > 0) {
          return content$(imgs[0]).attr("src") || null;
        }
      }
      return null;
    })();

  return {
    title:
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      $("title").text() ||
      readable?.title,
    content: readable?.textContent || "",
    author: author || null,
    source: new URL(finalUrl).hostname,
    url: finalUrl,
    mainImage: mainImage || null,
    publishedAt:
      getMeta("article:published_time") ||
      getMeta("og:pubdate") ||
      getMeta("pubdate") ||
      null,
  };
}

export { extractMetadataFromHTML };
