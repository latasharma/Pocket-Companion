import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';
import { XMLParser } from 'https://esm.sh/fast-xml-parser@4.3.6';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
});

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
};

function normalizeItems(feed: any): RssItem[] {
  const channel = feed?.rss?.channel ?? feed?.feed ?? feed?.channel;
  const items = channel?.item ?? channel?.entry ?? [];
  if (Array.isArray(items)) return items;
  return [items].filter(Boolean);
}

function getText(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && typeof val.text === 'string') return val.text;
  return '';
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing Supabase configuration', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: topics, error: topicsError } = await supabase
      .from('proactive_topics')
      .select('user_id, topic_type, keywords, rss_sources')
      .eq('topic_type', 'news');

    if (topicsError) {
      console.error('Error fetching proactive topics:', topicsError);
      return new Response('Error fetching topics', { status: 500 });
    }

    let inserted = 0;

    for (const topic of topics || []) {
      const rssSources: string[] = topic.rss_sources || [];
      if (!rssSources.length) continue;

      for (const rssUrl of rssSources) {
        try {
          const res = await fetch(rssUrl);
          if (!res.ok) {
            console.error('RSS fetch failed', rssUrl, res.status);
            continue;
          }
          const xml = await res.text();
          const feed = parser.parse(xml);
          const items = normalizeItems(feed);

          const rows = items
            .map((item: RssItem) => {
              const title = getText(item.title);
              const link = getText(item.link);
              const description = getText(item.description);
              const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : null;
              return { title, link, description, pubDate };
            })
            .filter((item) => item.title && matchesKeywords(`${item.title} ${item.description}`, topic.keywords || []))
            .slice(0, 20)
            .map((item) => ({
              user_id: topic.user_id,
              title: item.title,
              link: item.link,
              source: rssUrl,
              published_at: item.pubDate,
              keywords: topic.keywords || [],
            }));

          if (rows.length === 0) continue;

          const { error: insertError } = await supabase
            .from('news_items')
            .upsert(rows, { onConflict: 'user_id,link' });

          if (insertError) {
            console.error('Error inserting news items:', insertError);
            continue;
          }

          inserted += rows.length;
        } catch (err) {
          console.error('RSS parse error', rssUrl, err);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('rss-ingest error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
