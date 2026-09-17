import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "../../site.config";
import { getSiteCopy } from "../../i18n/ui";

export async function GET(context: APIContext) {
  const copy = getSiteCopy("en");

  const posts = (await getCollection("postsEn", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: copy.title,
    description: copy.description,
    site: context.site ?? SITE.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/en/posts/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: "<language>en</language>",
  });
}
