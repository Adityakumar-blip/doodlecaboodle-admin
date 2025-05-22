import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (item: T) => React.ReactNode;
  sortable?: boolean;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFunction?: (item: T, searchTerm: string) => boolean;
  onRowClick?: (item: T) => void;
  pagination?: {
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  className?: string;
};

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  searchable = false,
  searchPlaceholder = "Search...",
  searchFunction,
  onRowClick,
  pagination,
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({ key: "", direction: null });
  const [pageSize, setPageSize] = useState(pagination?.pageSize || 10);

  // Search function
  const handleSearch = (item: T) => {
    if (!searchTerm) return true;
    if (searchFunction) return searchFunction(item, searchTerm);

    // Default search across all string values
    return Object.values(item as Record<string, any>).some((value) =>
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Sorting
  const sortedData = React.useMemo(() => {
    let sortableData = [...data];
    if (sortConfig.direction) {
      sortableData.sort((a: T, b: T) => {
        const aValue = (a as any)[sortConfig.key];
        const bValue = (b as any)[sortConfig.key];

        if (aValue === bValue) return 0;

        const comparison = aValue > bValue ? 1 : -1;
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  // Filtered data
  const filteredData = React.useMemo(() => {
    return sortedData.filter(handleSearch);
  }, [sortedData, searchTerm]);

  // Pagination
  const paginatedData = React.useMemo(() => {
    if (!pagination) return filteredData;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  const pageCount = pagination ? Math.ceil(filteredData.length / pageSize) : 1;

  const handleSort = (columnId: string) => {
    setSortConfig((prev) => {
      if (prev.key === columnId) {
        if (prev.direction === "asc")
          return { key: columnId, direction: "desc" };
        if (prev.direction === "desc") return { key: "", direction: null };
      }
      return { key: columnId, direction: "asc" };
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search */}
      {searchable && (
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.sortable && "cursor-pointer select-none"
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && (
                      <div className="ml-2">
                        {sortConfig.key === column.id &&
                        sortConfig.direction === "asc" ? (
                          <SortAsc className="h-4 w-4" />
                        ) : sortConfig.key === column.id &&
                          sortConfig.direction === "desc" ? (
                          <SortDesc className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 opacity-0 group-hover:opacity-30">
                            <SortAsc className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <TableRow
                  key={keyExtractor(item)}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted")}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((column) => (
                    <TableCell key={`${keyExtractor(item)}-${column.id}`}>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pageCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{" "}
            {Math.min(filteredData.length, 1 + (currentPage - 1) * pageSize)}-
            {Math.min(filteredData.length, currentPage * pageSize)} of{" "}
            {filteredData.length} items
          </div>
          <div className="flex items-center space-x-6">
            {pagination.pageSizeOptions && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Rows per page
                </span>
                <select
                  className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                >
                  {pagination.pageSizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm">
                Page {currentPage} of {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, pageCount))
                }
                disabled={currentPage === pageCount}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
