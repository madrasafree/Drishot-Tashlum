"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  pageSize?: number;
}

export function SearchSelect({
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  value,
  onValueChange,
  disabled,
  pageSize,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) =>
      [option.label, option.description]
        .filter((entry): entry is string => Boolean(entry))
        .some((entry) => entry.toLowerCase().includes(normalizedSearch)),
    );
  }, [options, search]);
  const totalPages = pageSize ? Math.max(1, Math.ceil(filteredOptions.length / pageSize)) : 1;
  const visibleOptions = pageSize
    ? filteredOptions.slice((page - 1) * pageSize, page * pageSize)
    : filteredOptions;

  useEffect(() => {
    setPage(1);
  }, [search, options.length]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-11 w-full justify-between whitespace-normal py-3 text-right"
          disabled={disabled}
        >
          <span className={cn("line-clamp-2", !selectedOption && "text-slate-400")}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-xl border border-slate-200 bg-white p-0 shadow-xl">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandGroup>
              {visibleOptions.length === 0 ? (
                <CommandEmpty>{emptyText}</CommandEmpty>
              ) : null}
              {visibleOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={option.description ? [option.description] : undefined}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="text-right">
                      <div className="font-medium">{option.label}</div>
                      {option.description ? (
                        <div className="mt-1 text-xs leading-5 text-slate-500">{option.description}</div>
                      ) : null}
                    </div>
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-[var(--madrasa-blue)]",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {pageSize && totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page <= 1}
              >
                הקודם
              </Button>
              <span>
                עמוד {page} מתוך {totalPages} · {filteredOptions.length} תוצאות
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page >= totalPages}
              >
                הבא
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
