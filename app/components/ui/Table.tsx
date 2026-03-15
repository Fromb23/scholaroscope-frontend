import { ReactNode, useState, useEffect, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

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
    pagination?: PaginationConfig;
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
        <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children }: TableProps) {
    return (
        <thead className="bg-gray-50">
            {children}
        </thead>
    );
}

export function TableBody({ children }: TableProps) {
    return (
        <tbody className="divide-y divide-gray-200 bg-white">
            {children}
        </tbody>
    );
}

export function TableRow({ children, onClick, className }: TableProps & { onClick?: () => void; className?: string }) {
    return (
        <tr
            onClick={onClick}
            className={`${onClick ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''} ${className || ''}`}
        >
            {children}
        </tr>
    );
}

export function TableHead({ children, sortable, onSort, sortDirection }: TableProps & {
    sortable?: boolean;
    onSort?: () => void;
    sortDirection?: 'asc' | 'desc' | null;
}) {
    return (
        <th
            onClick={sortable ? onSort : undefined}
            className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                }`}
        >
            <div className="flex items-center gap-2">
                {children}
                {sortable && (
                    <span className="flex flex-col">
                        {sortDirection === null && <ChevronsUpDown className="w-4 h-4 text-gray-400" />}
                        {sortDirection === 'asc' && <ChevronUp className="w-4 h-4 text-blue-600" />}
                        {sortDirection === 'desc' && <ChevronDown className="w-4 h-4 text-blue-600" />}
                    </span>
                )}
            </div>
        </th>
    );
}

export function TableCell({ children, className }: TableProps & { className?: string }) {
    return (
        <td className={`px-6 py-4 text-sm text-gray-900 ${className || ''}`}>
            {children}
        </td>
    );
}

// ============================================================================
// Advanced DataTable Component
// ============================================================================

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    loading = false,
    pagination,
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
    onRowClick
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [filters, setFilters] = useState<FilterConfig[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        const newFilters = filters.filter(f => f.field !== field);
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

    return (
        <div className="space-y-4">
            {/* Search and Filters Bar */}
            {(enableSearch || enableFilter) && (
                <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    {enableSearch && onSearch && (
                        <div className="flex-1 min-w-75">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    {enableFilter && columns.filter(col => col.filterable).map(column => (
                        <div key={column.key} className="min-w-50">
                            <select
                                onChange={(e) => handleFilter(column.key, e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All {column.header}</option>
                                {column.filterOptions?.map(option => (
                                    <option key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <TableHead
                                    key={column.key}
                                    sortable={enableSort && column.sortable}
                                    onSort={() => handleSort(column.key)}
                                    sortDirection={
                                        sortConfig?.field === column.key ? sortConfig.direction : null
                                    }
                                >
                                    <div className={column.headerClassName}>
                                        {column.header}
                                    </div>
                                </TableHead>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-gray-500">Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data?.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center">
                                    <div className="text-gray-500">{emptyMessage}</div>
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
                                        <TableCell
                                            key={column.key}
                                            className={column.className}
                                        >
                                            {column.render
                                                ? column.render(row)
                                                : (row[column.key] as ReactNode)
                                            }
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && onPaginationChange && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg">
                    {/* Page size selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">Show</span>
                        <select
                            value={pagination.pageSize}
                            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-700">entries</span>
                    </div>

                    {/* Pagination info and controls */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-700">
                            Showing {Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)} to{' '}
                            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                            {pagination.totalItems} entries
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${pageNumber === pagination.currentPage
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-300 hover:bg-gray-50'
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
                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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