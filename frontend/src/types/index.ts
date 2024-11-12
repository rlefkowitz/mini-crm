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
export type DataType = 'string' | 'integer' | 'currency' | 'enum' | 'picklist';

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
// Relationship Types
// =======================

/**
 * Supported relationship types between tables.
 */
export type RelationshipType = 'one_to_one' | 'one_to_many' | 'many_to_many';

/**
 * Payload for creating a relationship attribute.
 */
export interface RelationshipAttributeCreate {
    name: string;
    data_type: DataType;
    constraints?: string;
}

/**
 * Represents a relationship attribute retrieved from the backend.
 */
export interface RelationshipAttributeRead {
    name: string;
    data_type: DataType;
    constraints?: string;
}

/**
 * Payload for creating a new relationship.
 */
export interface RelationshipCreate {
    name: string;
    from_table: string;
    to_table: string;
    relationship_type: RelationshipType;
    attributes?: RelationshipAttributeCreate[];
}

/**
 * Represents a relationship retrieved from the backend, including its attributes.
 */
export interface RelationshipRead {
    id: number;
    name: string;
    from_table: string;
    to_table: string;
    relationship_type: RelationshipType;
    attributes: RelationshipAttributeRead[];
}

// =======================
// Record Types
// =======================

/**
 * Represents a record within a table. The fields are dynamic based on the table's columns.
 */
export interface Record {
    id: number;
    [key: string]: any; // Dynamic fields corresponding to table columns and relationships
}

// =======================
// Schema Types
// =======================

/**
 * Represents the entire CRM schema, mapping each table to its columns and relationships.
 */
export interface Schema {
    [tableName: string]: {
        columns: Column[];
        relationships: {
            from: RelationshipRead[]; // Relationships originating from this table
            to: RelationshipRead[]; // Relationships pointing to this table
        };
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
