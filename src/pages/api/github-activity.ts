import type { APIRoute } from 'astro';
import { SITE_CONFIG } from '@/config';

const GITHUB_USERNAME = SITE_CONFIG.social.github.username;
const EXTERNAL_API_URL = `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}`;

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const response = await fetch(EXTERNAL_API_URL);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch GitHub data: ${response.status}` }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
