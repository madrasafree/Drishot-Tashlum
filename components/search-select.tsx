"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

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
}

export function SearchSelect({
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  value,
  onValueChange,
  disabled,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === value);

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
        <Command filter={(valueText, search, keywords) => {
          const haystack = [valueText, ...(keywords || [])].join(" ").toLowerCase();
          return haystack.includes(search.toLowerCase()) ? 1 : 0;
        }}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
