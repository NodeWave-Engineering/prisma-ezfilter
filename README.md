# @nodewave/prisma-ezfilter

A TypeScript package for building dynamic Prisma queries with type-safe filtering, searching, ordering, and range filtering with support for **multi-level nested relations**. This package provides a flexible and extensible way to translate standard query parameters into Prisma query options with optional validation and field mapping.

## Features

- 🎯 **Type-safe query building** with full TypeScript support
- 🔍 **Dynamic filtering** with support for exact matches, arrays, and relational data
- 🔗 **Multi-level nested relations** - handle deeply nested fields like `author.profile.address.city`
- 🔎 **Search functionality** with `contains` operator and multi-field search
- 📊 **Range filtering** for dates and numbers with automatic date parsing
- 📝 **Ordering** with customizable sort directions
- 📄 **Pagination** with configurable page sizes
- ✅ **Validation** with customizable specifications
- 🔄 **Field mapping** and transformation support
- 🌐 **Framework-agnostic** query parameter extraction
- 🏗️ **Modular architecture** for easy extension

## Installation

```bash
npm install @nodewave/prisma-ezfilter
```

## Quick Start

### Direct Usage

```typescript
import { BuildQueryFilter, createQueryBuilder } from '@nodewave/prisma-ezfilter';

// Create a query builder
const queryBuilder = new BuildQueryFilter();

// Define your filter with multi-level relations
const filter = {
  filters: {
    status: 'active',
    category: ['tech', 'business'],
    'author.profile.department.region': 'US', // Multi-level relation
    'company.departments.teams.lead.role': 'Senior Developer' // Deep nesting
  },
  searchFilters: {
    title: 'react',
    'author.profile.bio': 'software engineer' // Search in nested relations
  },
  rangedFilters: [
    {
      key: 'author.profile.createdAt', // Range on nested field
      start: '2023-01-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z'
    }
  ],
  orderKey: 'author.profile.department.name', // Order by nested field
  orderRule: 'asc',
  page: 1,
  rows: 20
};

// Build the query
const result = queryBuilder.build(filter);

// Use with Prisma
const posts = await prisma.post.findMany(result.query);
```

### From HTTP Query Parameters

```typescript
import { BuildQueryFilter, extractQueryFromParams } from '@nodewave/prisma-ezfilter';

// Extract from query parameters (framework-agnostic)
const queryParams = {
  filters: '{"status":"active","author.profile.department.region":"US"}',
  searchFilters: '{"title":"react","author.profile.bio":"engineer"}',
  orderKey: 'author.profile.createdAt',
  orderRule: 'desc',
  page: '1',
  rows: '20'
};

const filter = extractQueryFromParams(queryParams);
const queryBuilder = new BuildQueryFilter();
const result = queryBuilder.build(filter);

// Use with Prisma
const posts = await prisma.post.findMany(result.query);
```

## Multi-Level Relations Support

The package now supports **unlimited levels of nested relations**, allowing you to query deeply nested data structures:

### Examples of Supported Nesting Levels

```typescript
// Two levels
'author.profile.name'

// Three levels  
'posts.comments.user.profile.name'

// Four levels
'company.departments.teams.members.profile.role'

// Five levels
'organization.locations.buildings.floors.rooms.equipment.type'

// And so on...
```

### How It Works

The package automatically converts dot-notation fields into nested Prisma query objects:

```typescript
// Input: 'author.profile.department.region'
// Output: 
{
  author: {
    profile: {
      department: {
        region: 'US'
      }
    }
  }
}

// Input: 'company.departments.teams.lead.profile.role'
// Output:
{
  company: {
    departments: {
      teams: {
        lead: {
          profile: {
            role: 'Senior Developer'
          }
        }
      }
    }
  }
}
```

### Supported in All Query Types

Multi-level relations work across all filtering types:

- ✅ **Filters** - Exact matches on nested fields
- ✅ **Search Filters** - Text search in nested fields  
- ✅ **Range Filters** - Date/number ranges on nested fields
- ✅ **Order By** - Sorting by nested fields
- ✅ **Validation** - Relation validation at each level

## API Reference

### Core Types

#### `FilteringQuery`

```typescript
interface FilteringQuery {
  filters?: Record<string, any | any[] | null>;
  searchFilters?: Record<string, any | any[] | null>;
  rangedFilters?: RangedFilter[];
  orderKey?: string;
  orderRule?: 'asc' | 'desc';
  page?: number;
  rows?: number;
}
```

#### `RangedFilter`

```typescript
interface RangedFilter {
  key: string;
  start: string | number | Date;
  end: string | number | Date;
}
```

#### `QuerySpecification`

```typescript
interface QuerySpecification {
  allowedFields?: string[];
  allowedOperators?: PrismaOperator[];
  allowedRelations?: string[];
  maxPageSize?: number;
  defaultPageSize?: number;
  requiredFields?: string[];
  forbiddenFields?: string[];
}
```

#### `QueryParams` & `QueryExtractor`

```typescript
interface QueryParams {
  [key: string]: string | string[] | undefined;
}

interface QueryExtractor {
  getQueryParams(): QueryParams;
}
```

### BuildQueryFilter Class

#### Constructor

```typescript
new BuildQueryFilter(specification?: QuerySpecification, transformConfig?: TransformConfig)
```

#### Methods

- `build(filter: FilteringQuery): BuildQueryResult` - Builds a query with validation
- `buildWithoutValidation(filter: FilteringQuery): PrismaQueryOptions` - Builds a query without validation
- `validate(filter: FilteringQuery): ValidationResult` - Validates a query without building it
- `setSpecification(specification: QuerySpecification): void` - Updates the specification
- `setTransformConfig(config: TransformConfig): void` - Updates the transform configuration

### Utility Functions

- `createQueryBuilder(specification?, transformConfig?)` - Convenience function to create a query builder
- `buildFilterQuery(filter: FilteringQuery): PrismaQueryOptions` - Builds a query without validation
- `validateQuery(filter: FilteringQuery, specification?): ValidationResult` - Validates a query
- `transformWhereClause(whereConditions, config): any` - Transforms where conditions
- `transformOrderBy(orderBy, config): any` - Transforms order by clause
- `extractQueryFromParams(queryParams: QueryParams): FilteringQuery` - Extracts filter from query parameters
- `createQueryExtractor(params: QueryParams): QueryExtractor` - Creates a query extractor

## Usage Examples

### Basic Usage

```typescript
import { BuildQueryFilter } from '@nodewave/prisma-ezfilter';

const queryBuilder = new BuildQueryFilter();

const filter = {
  filters: {
    status: 'published',
    authorId: 'user123'
  },
  orderKey: 'createdAt',
  orderRule: 'desc',
  page: 1,
  rows: 10
};

const result = queryBuilder.build(filter);
// result.query contains the Prisma query options
// result.validation contains validation results
```

### Multi-Level Relational Filters

```typescript
const filter = {
  filters: {
    status: 'active',
    'author.profile.department.name': 'Engineering',
    'company.departments.teams.lead.profile.role': 'Senior Developer',
    'posts.comments.user.profile.verified': true
  }
};

// Generated Prisma query will include nested objects for each relation level
```

### Array Filters with Multi-Level Relations

```typescript
const filter = {
  filters: {
    status: 'active',
    category: ['tech', 'business', 'design'], // Creates OR condition
    priority: [1, 2, 3], // Numbers work too
    'author.profile.department.region': ['US', 'EU'], // Multi-level arrays
    'company.departments.teams.members.profile.skills': ['React', 'TypeScript'] // Deep nesting
  }
};

// Generated SQL equivalent:
// WHERE status = 'active' 
//   AND (category = 'tech' OR category = 'business' OR category = 'design')
//   AND (priority = 1 OR priority = 2 OR priority = 3)
//   AND (author.profile.department.region = 'US' OR author.profile.department.region = 'EU')
//   AND (company.departments.teams.members.profile.skills = 'React' OR company.departments.teams.members.profile.skills = 'TypeScript')
```

### Framework Integration

#### Express.js

```typescript
import express from 'express';
import { BuildQueryFilter, extractQueryFromParams } from '@nodewave/prisma-ezfilter';

const app = express();
const queryBuilder = new BuildQueryFilter();

app.get('/posts', async (req, res) => {
  try {
    // Extract from Express query parameters
    const filter = extractQueryFromParams(req.query);
    const result = queryBuilder.build(filter);
    
    if (!result.validation.isValid) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.validation.errors
      });
    }

    // Use with Prisma
    const posts = await prisma.post.findMany(result.query);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Example request with multi-level relations:
// GET /posts?filters={"status":"active","author.profile.department.region":"US"}&searchFilters={"author.profile.bio":"engineer"}&orderKey=author.profile.createdAt&orderRule=desc&page=1&rows=20
```

#### Hono

```typescript
import { Hono } from 'hono';
import { BuildQueryFilter, extractQueryFromParams } from '@nodewave/prisma-ezfilter';

const app = new Hono();
const queryBuilder = new BuildQueryFilter();

app.get('/posts', async (c) => {
  try {
    // Extract from Hono query parameters
    const queryParams = c.req.query();
    const filter = extractQueryFromParams(queryParams);
    const result = queryBuilder.build(filter);
    
    if (!result.validation.isValid) {
      return c.json({
        error: 'Invalid query parameters',
        details: result.validation.errors
      }, 400);
    }

    // Use with Prisma
    const posts = await prisma.post.findMany(result.query);
    return c.json(posts);
  } catch (error) {
    return c.json({ error: 'Server error' }, 500);
  }
});
```

#### Custom Framework Integration

```typescript
import { BuildQueryFilter, extractQueryFromParams, createQueryExtractor } from '@nodewave/prisma-ezfilter';

// Custom query extractor for any framework
class CustomQueryExtractor {
  private params: any;
  
  constructor(params: any) {
    this.params = params;
  }
  
  getQueryParams() {
    return this.params;
  }
}

// Usage
const customExtractor = new CustomQueryExtractor({
  filters: '{"status":"active","author.profile.department.region":"US"}',
  orderKey: 'author.profile.createdAt'
});

const queryParams = customExtractor.getQueryParams();
const filter = extractQueryFromParams(queryParams);
const queryBuilder = new BuildQueryFilter();
const result = queryBuilder.build(filter);
```

### With Validation

```typescript
const specification: QuerySpecification = {
  allowedFields: ['title', 'status', 'authorId', 'createdAt'],
  allowedRelations: ['author', 'profile', 'department', 'company', 'teams', 'members'], // Include all relation levels
  maxPageSize: 100,
  forbiddenFields: ['password', 'secret']
};

const queryBuilder = new BuildQueryFilter(specification);

const filter = {
  filters: {
    status: 'published',
    'author.profile.department.region': 'US', // Will be validated
    'company.departments.teams.lead.role': 'Developer' // Will be validated
  }
};

const result = queryBuilder.build(filter);
console.log(result.validation.warnings); // Check for warnings
```

### With Field Mapping

```typescript
const transformConfig: TransformConfig = {
  fieldMappings: {
    'userName': 'user.profile.name',
    'userDepartment': 'user.profile.department.name'
  },
  fieldNameMappings: {
    'userName': 'name',
    'userDepartment': 'departmentName'
  },
  fieldTypeHandlers: {
    'createdAt': {
      type: 'date',
      searchOperator: 'gte'
    }
  }
};

const queryBuilder = new BuildQueryFilter(undefined, transformConfig);

const filter = {
  filters: {
    userName: 'john', // Will be mapped to user.profile.name
    userDepartment: 'engineering' // Will be mapped to user.profile.department.name
  }
};

const result = queryBuilder.build(filter);
```

### Complex Multi-Level Queries

```typescript
const filter = {
  filters: {
    status: 'published',
    category: ['tech', 'business'],
    'author.profile.verified': true,
    'company.departments.teams.lead.profile.role': 'Senior Developer'
  },
  searchFilters: {
    title: 'react',
    'author.profile.bio': 'software engineer',
    'company.departments.teams.members.profile.skills': 'TypeScript'
  },
  rangedFilters: [
    {
      key: 'author.profile.createdAt',
      start: '2023-01-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z'
    },
    {
      key: 'company.departments.teams.createdAt',
      start: '2023-06-01T00:00:00Z',
      end: '2023-06-30T23:59:59Z'
    }
  ],
  orderKey: 'company.departments.teams.members.profile.createdAt',
  orderRule: 'desc',
  page: 2,
  rows: 25
};
```

## Query Parameter Format

The package supports standard query parameters that can be sent via HTTP requests:

### Supported Parameters

- `filters` - JSON string containing exact match filters
- `searchFilters` - JSON string containing search filters (uses `contains` operator)
- `rangedFilters` - JSON string containing range filters
- `orderKey` - Field name for ordering
- `orderRule` - Order direction (`asc` or `desc`)
- `page` - Page number for pagination
- `rows` - Number of rows per page

### Example HTTP Request with Multi-Level Relations

```bash
GET /posts?filters={"status":"active","author.profile.department.region":"US"}&searchFilters={"author.profile.bio":"engineer"}&orderKey=author.profile.createdAt&orderRule=desc&page=1&rows=20
```

### Array Support with Multi-Level Relations

Arrays in filters automatically create OR conditions, even with deeply nested relations:

```javascript
// Single value with multi-level relation
filters: '{"author.profile.department.region":"US"}'
// SQL: WHERE author.profile.department.region = 'US'

// Array values with multi-level relations
filters: '{"author.profile.department.region":["US","EU","APAC"]}'
// SQL: WHERE (author.profile.department.region = 'US' OR author.profile.department.region = 'EU' OR author.profile.department.region = 'APAC')'

// Mixed types with multi-level relations
filters: '{"status":"active","author.profile.department.region":["US","EU"],"company.departments.teams.lead.role":["Developer","Senior Developer"]}'
// SQL: WHERE status = 'active' AND (author.profile.department.region = 'US' OR author.profile.department.region = 'EU') AND (company.departments.teams.lead.role = 'Developer' OR company.departments.teams.lead.role = 'Senior Developer')'
```

## Advanced Features

### Custom Type Handlers

```typescript
const transformConfig: TransformConfig = {
  fieldTypeHandlers: {
    'price': {
      type: 'number',
      searchOperator: 'gte'
    },
    'isActive': {
      type: 'boolean'
    },
    'customField': {
      type: 'custom',
      customHandler: (value) => {
        // Custom transformation logic
        return { equals: value.toUpperCase() };
      }
    }
  }
};
```

### Custom Relation Handlers

```typescript
const transformConfig: TransformConfig = {
  relationHandlers: {
    'user': {
      type: 'one-to-many',
      relationQuery: 'some',
      customHandler: (value, field) => {
        return {
          some: {
            [field]: value
          }
        };
      }
    }
  }
};
```

## Error Handling

```typescript
const result = queryBuilder.build(filter);

if (!result.validation.isValid) {
  console.error('Validation errors:', result.validation.errors);
  return;
}

if (result.validation.warnings.length > 0) {
  console.warn('Validation warnings:', result.validation.warnings);
}

// Use the query
const data = await prisma.model.findMany(result.query);
```

## Testing

The package includes comprehensive end-to-end tests that cover:

- ✅ Query parameter extraction from HTTP requests
- ✅ Array filter processing (OR conditions)
- ✅ **Multi-level relational query handling** (NEW!)
- ✅ Search filter functionality in nested relations
- ✅ Range filter processing on nested fields
- ✅ Ordering by deeply nested fields
- ✅ Validation with specifications for multi-level relations
- ✅ Error handling for malformed data
- ✅ Framework-agnostic query extraction

### Multi-Level Relations Test Coverage

The new test suite specifically covers:

- ✅ Two-level relations (`author.profile.name`)
- ✅ Three-level relations (`posts.comments.user.profile.name`)
- ✅ Four-level relations (`company.departments.teams.members.profile.role`)
- ✅ Array values with multi-level relations
- ✅ Search filters in nested relations
- ✅ Range filters on nested fields
- ✅ Ordering by nested fields
- ✅ Complex queries combining multiple nesting levels
- ✅ Validation of multi-level relations

Run tests with:

```bash
npm test
```

## Migration from v0.1.0

If you're upgrading from the previous version:

1. **Package name changed**: `prisma-ezfilter` → `@nodewave/prisma-ezfilter`
2. **New feature**: Multi-level relations are now supported (previously only single-level)
3. **Enhanced validation**: Better support for validating nested relations
4. **Improved types**: Better TypeScript support for nested objects

### Breaking Changes

- None - all existing functionality remains the same
- Multi-level relations are additive and don't affect existing single-level queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.