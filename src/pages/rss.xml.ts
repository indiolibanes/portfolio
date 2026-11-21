import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { PUBLIC_PAGES, RSS, SITE } from '../config';

const entries = [PUBLIC_PAGES.rhea, PUBLIC_PAGES.sophia, PUBLIC_PAGES.curiosidades];

export const GET: APIRoute = ({ site = new URL(SITE.url) }) =>
  rss({
    title: RSS.title,
    description: SITE.description,
    site,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>pt-BR</language><atom:link href="${new URL(RSS.path, site).href}" rel="self" type="application/rss+xml" />`,
    items: entries.map(({ path, title, description }) => ({
      link: path,
      title,
      description,
    })),
  });
