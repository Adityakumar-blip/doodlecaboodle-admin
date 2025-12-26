import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface TreeOption {
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeOption[];
}

interface TreeMultiSelectProps {
  options: TreeOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  title?: string;
}

const TreeMultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select categories...",
  title = "Categories",
}: TreeMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build the tree structure from flat options if needed
  const treeData = useMemo(() => {
    const buildTree = (
      items: TreeOption[],
      parentId: string | null = null
    ): TreeOption[] => {
      return items
        .filter((item) => item.parentId === parentId)
        .map((item) => ({
          ...item,
          children: buildTree(items, item.id),
        }));
    };
    
    // Check if the input is already a tree or flat
    const isFlat = options.some(opt => opt.parentId !== undefined && !opt.children);
    return isFlat ? buildTree(options) : options;
  }, [options]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newValue = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(newValue);
  };

  const isSelected = (id: string) => value.includes(id);

  const filterTree = (nodes: TreeOption[], query: string): TreeOption[] => {
    return nodes
      .map((node): TreeOption | null => {
        const hasMatch = node.name.toLowerCase().includes(query.toLowerCase());
        const filteredChildren = node.children
          ? filterTree(node.children, query)
          : [];
        
        if (hasMatch || filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter((node): node is TreeOption => node !== null);
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery) return treeData;
    return filterTree(treeData, searchQuery);
  }, [treeData, searchQuery]);

  // Auto-expand nodes when searching
  useMemo(() => {
    if (searchQuery) {
      const ids = new Set<string>();
      const collectIds = (nodes: TreeOption[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            ids.add(node.id);
            collectIds(node.children);
          }
        });
      };
      collectIds(filteredTree);
      setExpandedIds(ids);
    }
  }, [searchQuery, filteredTree]);

  const renderNode = (node: TreeOption, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const selected = isSelected(node.id);

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={cn(
            "flex items-center py-2 px-3 rounded-lg hover:bg-artist-purple/5 cursor-pointer transition-all duration-200 group relative",
            selected && "bg-artist-purple/10"
          )}
          style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
          onClick={() => toggleSelect(node.id)}
        >
          {selected && (
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 bg-artist-purple rounded-r-full" />
          )}
          <div className="flex items-center flex-1 gap-2 overflow-hidden">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.id, e)}
                className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-artist-purple/10 text-muted-foreground transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <span className={cn(
               "text-sm truncate transition-colors",
               selected ? "font-semibold text-artist-purple" : "text-foreground group-hover:text-artist-purple"
            )}>
              {node.name}
            </span>
          </div>
          {selected && (
            <div className="bg-artist-purple rounded-full p-0.5 animate-in zoom-in duration-200">
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="flex flex-col mt-0.5">
            {node.children!.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const selectedItems = useMemo(() => {
    const allOptions = (function flatten(nodes: TreeOption[]): TreeOption[] {
      return nodes.reduce((acc: TreeOption[], node) => {
        return [...acc, node, ...(node.children ? flatten(node.children) : [])];
      }, []);
    })(options);
    
    return value
      .map(v => {
        const item = options.find(o => o.id === v) || allOptions.find(o => o.id === v);
        return item ? { id: item.id, name: item.name } : null;
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  }, [value, options]);

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between min-h-[2.75rem] h-auto p-2 border-slate-200 hover:border-artist-purple/50 transition-colors shadow-sm"
          >
            <div className="flex flex-wrap gap-1.5 items-center max-w-[90%]">
              {selectedItems.length > 0 ? (
                selectedItems.map((item) => (
                  <Badge
                    key={item.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 py-1 px-2.5 bg-artist-purple/10 text-artist-purple border-artist-purple/20 hover:bg-artist-purple/20 transition-colors"
                  >
                    {item.name}
                    <X
                      className="h-3.5 w-3.5 cursor-pointer text-artist-purple/50 hover:text-red-500 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    />
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground ml-1">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="mr-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-slate-200 shadow-xl animate-in fade-in zoom-in duration-200" align="start">
          <div className="flex flex-col">
            <div className="flex items-center border-b px-3.5 py-3 gap-2.5 bg-slate-50/50">
              <Search className="h-4.5 w-4.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="hover:text-red-500 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
              {filteredTree.length > 0 ? (
                filteredTree.map((node) => renderNode(node))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No categories found matching your search.</p>
                </div>
              )}
            </div>
            {value.length > 0 && (
              <div className="border-t p-2.5 flex justify-between items-center bg-slate-50/80 rounded-b-md">
                <span className="text-xs font-medium text-muted-foreground px-1">
                  {value.length} item{value.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-3 font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => onChange([])}
                >
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TreeMultiSelect;
