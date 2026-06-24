import { ReactNode, useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  BackgroundRefreshBadge,
  SectionLoading,
  TableSkeleton,
} from '@/app/components/ui/loading';

// ============================================================================
// Types
// ============================================================================

interface TableProps {
  children: ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  loadingMessage?: string;
  loadingVariant?: 'spinner' | 'skeleton';
  skeletonRows?: number;
  isRefreshing?: boolean;
  refreshMessage?: string;
  pagination?: PaginationConfig;
  initialSort?: SortConfig | null;
  onPaginationChange?: (page: number, pageSize: number) => void;
  onSearch?: (query: string) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: FilterConfig[]) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
  enableSearch?: boolean;
  enableSort?: boolean;
  enableFilter?: boolean;
  rowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: { label: string; value: unknown }[];
  className?: string;
  headerClassName?: string;
}

interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface FilterConfig {
  field: string;
  value: unknown;
}

interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Basic Table Components (Unchanged API)
// ============================================================================

export function Table({ children }: TableProps) {
  return (
    <div className="theme-table overflow-x-auto rounded-lg">
      <table className="min-w-full">{children}</table>
    </div>
  );
}

export function TableHeader({ children }: TableProps) {
  return <thead className="theme-table-header">{children}</thead>;
}

export function TableBody({ children }: TableProps) {
  return <tbody className="theme-surface">{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  className,
}: TableProps & { onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`theme-table-row border-b transition-colors theme-table-row-hover ${onClick ? 'cursor-pointer' : ''} ${className || ''}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  sortable,
  onSort,
  sortDirection,
}: TableProps & {
  sortable?: boolean;
  onSort?: () => void;
  sortDirection?: 'asc' | 'desc' | null;
}) {
  return (
    <th
      onClick={sortable ? onSort : undefined}
      className={`theme-subtle px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
        sortable ? 'cursor-pointer select-none theme-table-row-hover' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="flex flex-col">
            {sortDirection === null && <ChevronsUpDown className="h-4 w-4 theme-table-sort-icon" />}
            {sortDirection === 'asc' && <ChevronUp className="h-4 w-4 theme-table-sort-icon" />}
            {sortDirection === 'desc' && <ChevronDown className="h-4 w-4 theme-table-sort-icon" />}
          </span>
        )}
      </div>
    </th>
  );
}

export function TableCell({ children, className }: TableProps & { className?: string }) {
  return <td className={`px-6 py-4 text-sm theme-text ${className || ''}`}>{children}</td>;
}

// ============================================================================
// Advanced DataTable Component
// ============================================================================

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  pagination,
  initialSort = null,
  onPaginationChange,
  onSearch,
  onSort,
  onFilter,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  enableSearch = true,
  enableSort = true,
  enableFilter = false,
  rowClassName,
  onRowClick,
  loadingMessage = 'Preparing table data...',
  loadingVariant = 'spinner',
  skeletonRows = 6,
  isRefreshing = false,
  refreshMessage = 'Updating table...',
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSortConfig(initialSort);
  }, [initialSort]);

  // Handle search with debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch?.(searchQuery);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery, onSearch]);

  // Handle sort
  const handleSort = (field: string) => {
    if (!enableSort || !onSort) return;

    let direction: 'asc' | 'desc' = 'asc';

    if (sortConfig?.field === field) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    setSortConfig({ field, direction });
    onSort(field, direction);
  };

  // Handle filter
  const handleFilter = (field: string, value: unknown) => {
    if (!enableFilter || !onFilter) return;

    const newFilters = filters.filter((f) => f.field !== field);
    if (value) {
      newFilters.push({ field, value });
    }

    setFilters(newFilters);
    onFilter(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    if (onPaginationChange && pagination) {
      onPaginationChange(page, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    if (onPaginationChange && pagination) {
      onPaginationChange(1, pageSize);
    }
  };

  const hasRows = data?.length > 0;
  const initialLoading = loading && !hasRows && !isRefreshing;
  const showRefreshBadge = isRefreshing || (loading && hasRows);

  return (
    <div className="space-y-4">
      {showRefreshBadge ? (
        <div className="flex justify-end">
          <BackgroundRefreshBadge message={refreshMessage} />
        </div>
      ) : null}

      {/* Search and Filters Bar */}
      {(enableSearch || enableFilter) && (
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          {enableSearch && onSearch && (
            <div className="flex-1 min-w-75">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 theme-subtle" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="theme-input w-full rounded-lg py-2 pl-10 pr-4"
                />
              </div>
            </div>
          )}

          {/* Filters */}
          {enableFilter &&
            columns
              .filter((col) => col.filterable)
              .map((column) => (
                <div key={column.key} className="min-w-50">
                  <select
                    onChange={(e) => handleFilter(column.key, e.target.value)}
                    className="theme-input theme-select w-full rounded-lg px-4 py-2"
                  >
                    <option value="">All {column.header}</option>
                    {column.filterOptions?.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
        </div>
      )}

      {initialLoading && loadingVariant === 'skeleton' ? (
        <TableSkeleton rows={skeletonRows} columns={columns.length} />
      ) : initialLoading ? (
        <SectionLoading title={loadingMessage} />
      ) : (
        <div className="theme-table overflow-x-auto rounded-lg">
        <table className="min-w-full table-fixed">
          <thead className="theme-table-header">
            <tr>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  sortable={enableSort && column.sortable}
                  onSort={() => handleSort(column.key)}
                  sortDirection={sortConfig?.field === column.key ? sortConfig.direction : null}
                >
                  <div className={column.headerClassName}>{column.header}</div>
                </TableHead>
              ))}
            </tr>
          </thead>
          <tbody className="theme-surface">
            {data?.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="theme-muted">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              data?.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={rowClassName ? rowClassName(row) : ''}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render ? column.render(row) : (row[column.key] as ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      {!initialLoading && pagination && onPaginationChange && (
        <div className="theme-card flex items-center justify-between rounded-lg px-4 py-3">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm theme-muted">Show</span>
            <select
              value={pagination.pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="theme-input theme-select rounded-lg px-3 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm theme-muted">entries</span>
          </div>

          {/* Pagination info and controls */}
          <div className="flex items-center gap-4">
            <span className="text-sm theme-muted">
              Showing{' '}
              {Math.min(
                (pagination.currentPage - 1) * pagination.pageSize + 1,
                pagination.totalItems,
              )}{' '}
              to {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
              {pagination.totalItems} entries
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="theme-focus-ring theme-border theme-text rounded-lg border p-2 transition-colors theme-hover-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNumber;
                  if (pagination.totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNumber = pagination.totalPages - 4 + i;
                  } else {
                    pageNumber = pagination.currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        pageNumber === pagination.currentPage
                          ? 'theme-button-primary'
                          : 'theme-border theme-text border theme-hover-surface'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="theme-focus-ring theme-border theme-text rounded-lg border p-2 transition-colors theme-hover-surface disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
