// types/index.ts

// =======================
// Authentication Types
// =======================

/**
 * Represents a user in the system.
 */
export interface User {
    id: number;
    username: string;
    email: string;
}

/**
 * Response returned upon successful authentication.
 */
export interface AuthResponse {
    access_token: string;
    token_type: string;
}

// =======================
// Enum Types
// =======================

/**
 * Payload for creating a new enum value.
 */
export interface EnumValueCreate {
    value: string;
}

/**
 * Represents an enum value retrieved from the backend.
 */
export interface EnumValueRead {
    id: number;
    value: string;
}

/**
 * Payload for creating a new enum with multiple values.
 */
export interface EnumCreate {
    name: string;
    values: EnumValueCreate[];
}

/**
 * Represents an enum retrieved from the backend, including its values.
 */
export interface EnumRead {
    id: number;
    name: string;
    values: EnumValueRead[];
}

// =======================
// Column Types
// =======================

/**
 * Supported data types for columns.
 */
export type DataType = 'string' | 'integer' | 'currency' | 'enum' | 'reference' | 'picklist';

/**
 * Represents a column within a table.
 */
export interface Column {
    id: number;
    name: string;
    data_type: DataType;
    constraints?: string;
    required: boolean;
    unique: boolean;
    enum_id?: number; // References Enum if data_type is 'enum'
    reference_link_table_id?: number; // References LinkTable if data_type is 'reference'
    is_list: boolean;
    searchable: boolean;
}

// =======================
// Table Types
// =======================

/**
 * Represents a table in the CRM schema.
 */
export interface TableRead {
    id: number;
    name: string;
    columns: Column[];
}

// =======================
// Link Table Types
// =======================

/**
 * Represents a link table in the CRM schema.
 */
export interface LinkTable {
    id: number;
    name: string;
    from_table: string;
    to_table: string;
    columns: Column[];
}

// =======================
// Record Types
// =======================

/**
 * Represents a record within a table. The fields are dynamic based on the table's columns.
 */
export interface Record {
    id: number;
    data: {[key: string]: any}; // Data field containing dynamic fields
}

// =======================
// Schema Types
// =======================

/**
 * Represents the entire CRM schema, mapping each table to its columns and link tables.
 */
export interface Schema {
    [tableName: string]: {
        id: number;
        columns: Column[];
        link_tables: LinkTable[];
    };
}

// =======================
// API Response Types
// =======================

/**
 * Represents an error response from the API.
 */
export interface APIError {
    detail: string;
}

// =======================
// Utility Types
// =======================

/**
 * Represents options for select dropdowns.
 */
export interface SelectOption {
    label: string;
    value: any;
}
