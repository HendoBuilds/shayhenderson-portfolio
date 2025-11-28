import React, { useState, useEffect } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import type { Activity } from "react-activity-calendar";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/config";

const GITHUB_USERNAME = SITE_CONFIG.social.github.username;
const API_URL = '/api/github-activity';
const CACHE_KEY = 'github-activity-cache';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const FETCH_TIMEOUT = 10000; // 10 seconds

const CALENDAR_CONFIG = {
  blockSize: 11,
  blockMargin: 3,
  fontSize: 13,
  maxLevel: 4,
} as const;

const CUSTOM_THEME = {
  light: [
    "hsl(0, 0%, 92%)",   // Level 0 - lightest
    "hsl(0, 0%, 70%)",   // Level 1
    "hsl(0, 0%, 50%)",   // Level 2
    "hsl(0, 0%, 30%)",   // Level 3
    "hsl(0, 0%, 9%)",    // Level 4 - darkest (primary)
  ],
  dark: [
    "hsl(0, 0%, 20%)",   // Level 0 - darkest
    "hsl(0, 0%, 40%)",   // Level 1
    "hsl(0, 0%, 60%)",   // Level 2
    "hsl(0, 0%, 80%)",   // Level 3
    "hsl(0, 0%, 98%)",   // Level 4 - lightest (foreground)
  ],
};

interface GitHubActivityProps {
  className?: string;
}

interface GitHubData {
  total: Record<string | number, number>;
  contributions: Activity[];
}

/** Displays GitHub contribution calendar with caching */
export const GitHubActivity = ({ className }: GitHubActivityProps) => {
  const [data, setData] = useState<Activity[] | null>(null);
  const [totalContributions, setTotalContributions] = useState<number>(0);
  const [yearRange, setYearRange] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const fetchGitHubData = async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const { data: cachedData, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
              if (isMounted) {
                setData(cachedData.contributions);
                setYearRange(cachedData.yearRange);
                setTotalContributions(cachedData.total);
                setIsLoading(false);
              }
              clearTimeout(timeoutId);
              return;
            }
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn("Failed to parse cache, fetching fresh data", e);
            }
          }
        }

        if (!isMounted) return;
        setIsLoading(true);

        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch GitHub data: ${response.status}`);
        }

        const json: GitHubData = await response.json();

        if (!json.contributions || !Array.isArray(json.contributions) || !json.total) {
          throw new Error("Invalid data structure received");
        }

        if (json.contributions.length > 0) {
          const sample = json.contributions[0];
          if (!sample.date || typeof sample.count !== 'number') {
            throw new Error("Invalid contribution data format");
          }
        }

        const sortedContributions = [...json.contributions].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        const lastYearData = sortedContributions.slice(-365);

        let yearRange = "";
        if (lastYearData.length > 0) {
          const firstDate = new Date(lastYearData[0].date);
          const lastDate = new Date(lastYearData[lastYearData.length - 1].date);
          const startYear = firstDate.getFullYear();
          const endYear = lastDate.getFullYear();

          yearRange = startYear === endYear ? `${startYear}` : `${startYear} - ${endYear}`;
        }

        const currentYear = new Date().getFullYear();
        const total = json.total[currentYear] || json.total["lastYear"] ||
          lastYearData.reduce((sum, day) => sum + day.count, 0);

        if (isMounted) {
          setData(lastYearData);
          setYearRange(yearRange);
          setTotalContributions(total);
          setIsLoading(false);

          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data: {
                contributions: lastYearData,
                yearRange,
                total,
              },
              timestamp: Date.now()
            }));
          } catch (e) {
            if (import.meta.env.DEV) {
              console.warn("Failed to cache GitHub data", e);
            }
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          if (import.meta.env.DEV) {
            console.error("Error fetching GitHub data:", err);
          }

          if (err instanceof Error && err.name === 'AbortError') {
            setError('Request timed out. Please try again.');
          } else {
            setError(err instanceof Error ? err.message : "Unable to load GitHub activity");
          }
          setIsLoading(false);
        }
      }
    };

    fetchGitHubData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <div className={cn("py-8 md:py-12 lg:py-16 max-w-full overflow-hidden", className)}>
      <h2 className="section-title text-center mb-8">GitHub Activity</h2>

      <div className="relative flex h-full w-full max-w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background py-12 md:py-16 lg:py-20 md:shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-2">
          <a
            href={`https://github.com/${GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${GITHUB_USERNAME}'s GitHub profile`}
            className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg
              className="w-6 h-6 transition-transform group-hover:scale-110"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-lg font-semibold">@{GITHUB_USERNAME}</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>

          {!isLoading && !error && (
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{totalContributions.toLocaleString()}</span> contributions in the last year
              </div>
              {yearRange && (
                <div className="text-xs text-muted-foreground">
                  {yearRange}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-4xl px-6 md:px-10 overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                <p className="text-sm text-muted-foreground">Loading GitHub activity...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12" role="alert" aria-live="assertive">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <a
                  href={`https://github.com/${GITHUB_USERNAME}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View profile on GitHub
                </a>
              </div>
            </div>
          )}

          {!isLoading && !error && data && (
            <section aria-label="GitHub contribution calendar" role="region">
              <div className="github-calendar-container">
                <ActivityCalendar
                  data={data}
                  theme={CUSTOM_THEME}
                  blockSize={CALENDAR_CONFIG.blockSize}
                  blockMargin={CALENDAR_CONFIG.blockMargin}
                  fontSize={CALENDAR_CONFIG.fontSize}
                  hideTotalCount
                  maxLevel={CALENDAR_CONFIG.maxLevel}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <style>{`
        .github-calendar-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          overflow: hidden;
        }

        .react-activity-calendar {
          max-width: 100%;
          width: auto;
        }

        @media (max-width: 1024px) {
          .react-activity-calendar {
            transform: scale(0.95);
          }
        }

        @media (max-width: 768px) {
          .react-activity-calendar {
            transform: scale(0.85);
          }
        }

        @media (max-width: 640px) {
          .react-activity-calendar {
            transform: scale(0.75);
          }
        }

        .react-activity-calendar text {
          fill: hsl(var(--muted-foreground));
          font-size: 12px;
        }

        .dark .react-activity-calendar text {
          fill: hsl(var(--muted-foreground));
        }

        [data-tooltip-content] {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        [data-tooltip-content]:hover {
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .react-activity-calendar text {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};
