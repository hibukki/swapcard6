import * as React from "react";
import { useQuery } from "convex/react";
import { X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface UserMultiSelectProps {
  selectedUsers: Doc<"users">[];
  onSelectionChange: (users: Doc<"users">[]) => void;
  excludeUserIds?: Id<"users">[];
  placeholder?: string;
  className?: string;
}

export function UserMultiSelect({
  selectedUsers,
  onSelectionChange,
  excludeUserIds = [],
  placeholder = "Search users...",
  className,
}: UserMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Get all users except current user
  const allUsers = useQuery(api.users.listUsers);

  // Filter users based on search and exclusions
  const availableUsers = React.useMemo(() => {
    if (!allUsers) return [];

    const selectedIds = new Set(selectedUsers.map((u) => u._id));
    const excludeIds = new Set(excludeUserIds);

    return allUsers.filter((user) => {
      // Exclude already selected and explicitly excluded users
      if (selectedIds.has(user._id) || excludeIds.has(user._id)) {
        return false;
      }

      // Filter by search term
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = user.name?.toLowerCase().includes(searchLower);
        const roleMatch = user.role?.toLowerCase().includes(searchLower);
        const companyMatch = user.company?.toLowerCase().includes(searchLower);
        return nameMatch || roleMatch || companyMatch;
      }

      return true;
    });
  }, [allUsers, selectedUsers, excludeUserIds, search]);

  const handleSelect = (user: Doc<"users">) => {
    onSelectionChange([...selectedUsers, user]);
    setSearch("");
    // Keep popover open for multi-select
  };

  const handleRemove = (userId: Id<"users">) => {
    onSelectionChange(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab to select first item
    if (e.key === "Tab" && availableUsers.length > 0 && search) {
      e.preventDefault();
      handleSelect(availableUsers[0]);
    }
    // Backspace to remove last selected when input is empty
    if (e.key === "Backspace" && !search && selectedUsers.length > 0) {
      handleRemove(selectedUsers[selectedUsers.length - 1]._id);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected users as badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <Badge
              key={user._id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={user.imageUrl} alt={user.name} />
                <AvatarFallback className="text-[10px]">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{user.name}</span>
              <button
                type="button"
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                onClick={() => handleRemove(user._id)}
                aria-label={`Remove ${user.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search input with dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex min-h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text"
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
          >
            <span className="text-muted-foreground">
              {selectedUsers.length === 0 ? placeholder : "Add more..."}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder={placeholder}
              value={search}
              onValueChange={setSearch}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                {allUsers === undefined ? "Loading..." : "No users found."}
              </CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => (
                  <CommandItem
                    key={user._id}
                    value={user._id}
                    onSelect={() => handleSelect(user)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.imageUrl} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.name}</div>
                      {(user.role || user.company) && (
                        <div className="text-xs text-muted-foreground truncate">
                          {user.role}
                          {user.role && user.company && " at "}
                          {user.company}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {search && availableUsers.length > 0 && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                Press <kbd className="px-1 bg-muted rounded">Tab</kbd> to select
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
