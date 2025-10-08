import {
    FilteringQuery,
    OrderDirection,
    PrismaOrderBy,
    PrismaQueryOptions,
    PrismaWhereCondition,
    RangedFilter,
    QuerySpecification
} from '../types';

/**
 * Builds a Prisma query from filtering parameters
 */
export function buildFilterQuery(filter: FilteringQuery, specification?: QuerySpecification): PrismaQueryOptions {
    const query: PrismaQueryOptions = {
        where: {
            AND: [],
        },
        orderBy: {},
        take: 10,
        skip: 0,
    };

    // Build where conditions
    if (filter.filters) {
        const whereConditions = buildWhereQuery(filter.filters);
        query.where!['AND'] = [...(query.where!['AND'] as any[]), ...whereConditions];
    }

    if (filter.searchFilters) {
        const searchConditions = buildSearchQuery(filter.searchFilters, specification);
        query.where!['AND'] = [...(query.where!['AND'] as any[]), ...searchConditions];
    }

    if (filter.rangedFilters) {
        const rangeConditions = buildRangedFilter(filter.rangedFilters);
        query.where!['AND'] = [...(query.where!['AND'] as any[]), ...rangeConditions];
    }

    // Build order by
    if (filter.orderKey) {
        const orderRule: OrderDirection = filter.orderRule ?? 'asc';
        query.orderBy = buildNestedOrderBy(filter.orderKey, orderRule);
    }

    // Build pagination
    const { take, skip } = buildPagination(filter);
    query.take = take;
    query.skip = skip;

    return query;
}

/**
 * Builds nested order by object for multi-level relations
 */
function buildNestedOrderBy(orderKey: string, orderRule: OrderDirection): PrismaOrderBy {
    if (!orderKey.includes('.')) {
        return { [orderKey]: orderRule };
    }

    const parts = orderKey.split('.');
    const lastPart = parts.pop()!;

    let current: PrismaOrderBy = { [lastPart]: orderRule };

    // Build from right to left
    for (let i = parts.length - 1; i >= 0; i--) {
        current = { [parts[i]]: current };
    }

    return current;
}

/**
 * Builds where conditions from filters with multi-level relation support
 */
function buildWhereQuery(filters: Record<string, any | any[] | null>): PrismaWhereCondition[] {
    const whereConditions: PrismaWhereCondition[] = [];

    for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined) continue;

        // Handle multi-level relational data filter
        if (key.includes('.')) {
            if (Array.isArray(value)) {
                const orQueryArray = value.map((val) => buildNestedWhere(key, val));
                whereConditions.push({
                    OR: orQueryArray,
                });
            } else {
                whereConditions.push(buildNestedWhere(key, value));
            }
            continue;
        }

        // Handle regular fields
        if (Array.isArray(value)) {
            const orQueryArray = value.map((val) => ({
                [key]: val,
            }));
            whereConditions.push({
                OR: orQueryArray,
            });
        } else {
            whereConditions.push({
                [key]: value,
            });
        }
    }

    return whereConditions;
}

/**
 * Builds nested where condition for multi-level relations
 */
function buildNestedWhere(key: string, value: any): PrismaWhereCondition {
    if (!key.includes('.')) {
        return { [key]: value };
    }

    const parts = key.split('.');
    const lastPart = parts.pop()!;

    let current = { [lastPart]: value };

    // Build from right to left
    for (let i = parts.length - 1; i >= 0; i--) {
        current = { [parts[i]]: current };
    }

    return current;
}

/**
 * Builds search conditions from search filters with multi-level relation support
 */
function buildSearchQuery(searchFilters: Record<string, any | any[] | null>, specification?: QuerySpecification): PrismaWhereCondition[] {
    const whereConditions: PrismaWhereCondition[] = [];
    const orQuerySearchArray: PrismaWhereCondition[] = [];

    const isMultiKey = Object.values(searchFilters).length > 1;

    for (const [key, value] of Object.entries(searchFilters)) {
        if (value === null || value === undefined) continue;

        let searchQuery: PrismaWhereCondition = {};

        const searchMode = specification?.defaultSearchMode || 'insensitive';
        
        if (key.includes('.')) {
            searchQuery = buildNestedSearch(key, value, searchMode);
        } else {
            searchQuery = {
                [key]: {
                    contains: value,
                    mode: searchMode,
                },
            };
        }

        if (isMultiKey) {
            orQuerySearchArray.push(searchQuery);
        } else {
            whereConditions.push(searchQuery);
        }
    }

    if (isMultiKey && orQuerySearchArray.length > 0) {
        whereConditions.push({
            OR: orQuerySearchArray,
        });
    }

    return whereConditions;
}

/**
 * Builds nested search condition for multi-level relations
 */
function buildNestedSearch(key: string, value: any, searchMode: 'insensitive' | 'sensitive' = 'insensitive'): PrismaWhereCondition {
    if (!key.includes('.')) {
        return { [key]: { contains: value, mode: searchMode } };
    }

    const parts = key.split('.');
    const lastPart = parts.pop()!;

    let current: PrismaWhereCondition = { [lastPart]: { contains: value, mode: searchMode } };

    // Build from right to left
    for (let i = parts.length - 1; i >= 0; i--) {
        current = { [parts[i]]: current };
    }

    return current;
}

/**
 * Builds ranged filter conditions with multi-level relation support
 */
function buildRangedFilter(rangedFilters: RangedFilter[]): PrismaWhereCondition[] {
    const whereConditions: PrismaWhereCondition[] = [];

    for (const range of rangedFilters) {
        if (range.key.includes('.')) {
            whereConditions.push(buildNestedRange(range));
        } else {
            whereConditions.push({
                [range.key]: {
                    gte: range.start,
                    lte: range.end,
                },
            });
        }
    }

    return whereConditions;
}

/**
 * Builds nested range condition for multi-level relations
 */
function buildNestedRange(range: RangedFilter): PrismaWhereCondition {
    const parts = range.key.split('.');
    const lastPart = parts.pop()!;

    let current: PrismaWhereCondition = { [lastPart]: { gte: range.start, lte: range.end } };

    // Build from right to left
    for (let i = parts.length - 1; i >= 0; i--) {
        current = { [parts[i]]: current };
    }

    return current;
}

/**
 * Builds pagination parameters
 */
function buildPagination(filter: FilteringQuery): { take: number; skip: number } {
    let take = 10;
    let skip = 0;

    if (filter.page) {
        if (filter.rows) {
            skip = (filter.page - 1) * filter.rows;
            take = filter.rows;
        } else {
            skip = 10 * (filter.page - 1);
        }
    }

    return { take, skip };
} 