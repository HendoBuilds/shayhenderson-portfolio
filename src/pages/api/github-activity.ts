import type { APIRoute } from 'astro';
import { SITE_CONFIG } from '@/config';

const GITHUB_USERNAME = SITE_CONFIG.social.github.username;
const EXTERNAL_API_URL = `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}`;
const FETCH_TIMEOUT = 10000;

interface ExternalActivity {
  date: string;
  count: number;
  level: number;
}

interface ExternalApiResponse {
  total: Record<string | number, number>;
  contributions: ExternalActivity[];
}

export const prerender = false;

export const GET: APIRoute = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(EXTERNAL_API_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch GitHub data: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: ExternalApiResponse = await response.json();

    if (!data.contributions || !Array.isArray(data.contributions) || !data.total) {
      return new Response(
        JSON.stringify({ error: 'Invalid data structure from GitHub API' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter out future dates and sort chronologically
    const today = new Date().toISOString().split('T')[0];
    const sortedContributions = data.contributions
      .filter((c) => c.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get last 365 days for the calendar
    const lastYearData = sortedContributions.slice(-365);

    // Calculate year range
    let yearRange = '';
    if (lastYearData.length > 0) {
      const startYear = new Date(lastYearData[0].date).getFullYear();
      const endYear = new Date(lastYearData[lastYearData.length - 1].date).getFullYear();
      yearRange = startYear === endYear ? `${startYear}` : `${startYear} - ${endYear}`;
    }

    // Calculate totals
    const lastYearTotal = lastYearData.reduce((sum, day) => sum + day.count, 0);
    const allTimeTotal = Object.values(data.total).reduce((sum, count) => sum + count, 0);

    return new Response(
      JSON.stringify({
        contributions: lastYearData,
        lastYearTotal,
        allTimeTotal,
        yearRange,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      }
    );
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timed out' }),
        { status: 504, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
