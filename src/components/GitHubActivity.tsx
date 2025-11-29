import React, { useState, useEffect } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import type { Activity } from "react-activity-calendar";
import { Tooltip } from "react-tooltip";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/config";

const GITHUB_USERNAME = SITE_CONFIG.social.github.username;
const API_URL = "/api/github-activity";
const CACHE_KEY = "github-activity-cache";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const CACHE_VERSION = 2;
const FETCH_TIMEOUT = 10000;

const CALENDAR_CONFIG = {
  blockSize: 11,
  blockMargin: 3,
  fontSize: 13,
  maxLevel: 4,
} as const;

const CUSTOM_THEME = {
  light: [
    "hsl(0, 0%, 92%)",
    "hsl(0, 0%, 70%)",
    "hsl(0, 0%, 50%)",
    "hsl(0, 0%, 30%)",
    "hsl(0, 0%, 9%)",
  ],
  dark: [
    "hsl(0, 0%, 20%)",
    "hsl(0, 0%, 40%)",
    "hsl(0, 0%, 60%)",
    "hsl(0, 0%, 80%)",
    "hsl(0, 0%, 98%)",
  ],
};

interface GitHubActivityProps {
  className?: string;
}

interface GitHubData {
  contributions: Activity[];
  lastYearTotal: number;
  allTimeTotal: number;
  yearRange: string;
}

interface CachedData {
  data: GitHubData;
  timestamp: number;
  version: number;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatTooltip = (count: number, date: string): string => {
  const formattedDate = formatDate(date);
  if (count === 0) return `No contributions on ${formattedDate}`;
  if (count === 1) return `1 contribution on ${formattedDate}`;
  return `${count} contributions on ${formattedDate}`;
};

export const GitHubActivity = ({ className }: GitHubActivityProps) => {
  const [data, setData] = useState<GitHubData | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const fetchData = async () => {
      // Check cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: CachedData = JSON.parse(cached);
          if (
            parsed.version === CACHE_VERSION &&
            Date.now() - parsed.timestamp < CACHE_TTL
          ) {
            if (isMounted) {
              setData(parsed.data);
              setStatus("success");
            }
            clearTimeout(timeoutId);
            return;
          }
        }
      } catch {
        // Invalid cache, continue to fetch
      }

      try {
        const response = await fetch(API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch: ${response.status}`);
        }

        const result: GitHubData = await response.json();

        if (isMounted) {
          setData(result);
          setStatus("success");

          // Cache the result
          try {
            const cacheData: CachedData = {
              data: result,
              timestamp: Date.now(),
              version: CACHE_VERSION,
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
          } catch {
            // Cache write failed, continue
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (isMounted) {
          if (err instanceof Error && err.name === "AbortError") {
            setError("Request timed out. Please try again.");
          } else {
            setError(err instanceof Error ? err.message : "Unable to load GitHub activity");
          }
          setStatus("error");
        }
      }
    };

    fetchData();

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

          {status === "success" && data && (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {data.lastYearTotal.toLocaleString()}
                </span>{" "}
                contributions in the last year
              </div>
              <span className="hidden sm:inline text-muted-foreground/50">•</span>
              <div>
                <span className="font-semibold text-foreground">
                  {data.allTimeTotal.toLocaleString()}
                </span>{" "}
                all time
              </div>
            </div>
          )}
        </div>

        <div className="w-full max-w-4xl px-6 md:px-10 overflow-hidden">
          {status === "loading" && (
            <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">Loading GitHub activity...</p>
              </div>
            </div>
          )}

          {status === "error" && (
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

          {status === "success" && data && (
            <section aria-label="GitHub contribution calendar" role="region">
              <div className="flex justify-center w-full overflow-hidden [&_.react-activity-calendar]:max-w-full [&_.react-activity-calendar_text]:fill-muted-foreground [&_.react-activity-calendar_text]:text-xs lg:[&_.react-activity-calendar]:scale-100 md:[&_.react-activity-calendar]:scale-95 sm:[&_.react-activity-calendar]:scale-85 [&_.react-activity-calendar]:scale-75">
                <ActivityCalendar
                  data={data.contributions}
                  theme={CUSTOM_THEME}
                  blockSize={CALENDAR_CONFIG.blockSize}
                  blockMargin={CALENDAR_CONFIG.blockMargin}
                  fontSize={CALENDAR_CONFIG.fontSize}
                  hideTotalCount
                  maxLevel={CALENDAR_CONFIG.maxLevel}
                  renderBlock={(block, activity) =>
                    React.cloneElement(block, {
                      "data-tooltip-id": "github-activity-tooltip",
                      "data-tooltip-content": formatTooltip(activity.count, activity.date),
                    })
                  }
                />
                <Tooltip
                  id="github-activity-tooltip"
                  className="!bg-popover !text-popover-foreground !text-xs !px-3 !py-2 !rounded-md !shadow-md !border !border-border"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
