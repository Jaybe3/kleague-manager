"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PlayerSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  playerMatchKey: string;
  keeperCost: number | null;
  isKeeperEligible: boolean;
  acquisitionType: string;
  draftRound: number | null;
}

interface PlayerSearchProps {
  slotId: number | null;
  seasonYear: number;
  onSelect: (player: PlayerSearchResult) => void;
  placeholder?: string;
  disabled?: boolean;
  excludePlayerIds?: string[];
}

export function PlayerSearch({
  slotId,
  seasonYear,
  onSelect,
  placeholder = "Search players...",
  disabled = false,
  excludePlayerIds = [],
}: PlayerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch players from roster API
  const fetchPlayers = useCallback(
    async (searchQuery: string) => {
      if (!slotId) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          slotId: String(slotId),
          seasonYear: String(seasonYear),
        });

        if (searchQuery.trim()) {
          params.set("query", searchQuery.trim());
        }

        const response = await fetch(`/api/admin/trade/roster?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch players");
        }

        // Filter out excluded players
        const filtered = data.players.filter(
          (p: PlayerSearchResult) => !excludePlayerIds.includes(p.id)
        );

        setResults(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [slotId, seasonYear, excludePlayerIds]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!slotId) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchPlayers(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, slotId, fetchPlayers]);

  // Load initial roster when slotId changes
  useEffect(() => {
    if (slotId) {
      fetchPlayers("");
    } else {
      setResults([]);
    }
  }, [slotId, fetchPlayers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (player: PlayerSearchResult) => {
    onSelect(player);
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    if (slotId) {
      setIsOpen(true);
    }
  };

  const isDisabled = disabled || !slotId;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={slotId ? placeholder : "Select a team first"}
          disabled={isDisabled}
          className="pl-9 pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && slotId && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto"
        >
          {error ? (
            <div className="p-3 text-sm text-destructive">{error}</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              {loading ? "Searching..." : "No players found"}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((player, index) => (
                <li
                  key={player.id}
                  onClick={() => handleSelect(player)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "px-3 py-2 cursor-pointer flex items-center justify-between gap-2",
                    highlightedIndex === index
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {player.firstName} {player.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.acquisitionType === "DRAFT" && player.draftRound
                          ? `Drafted R${player.draftRound}`
                          : player.acquisitionType === "FA"
                          ? "Free Agent"
                          : player.acquisitionType === "TRADE"
                          ? "Traded"
                          : player.acquisitionType}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {player.position}
                    </Badge>
                    {player.isKeeperEligible && player.keeperCost && (
                      <Badge variant="secondary" className="text-xs">
                        R{player.keeperCost}
                      </Badge>
                    )}
                    {!player.isKeeperEligible && (
                      <Badge variant="destructive" className="text-xs">
                        N/A
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
