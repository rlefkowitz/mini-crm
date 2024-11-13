export interface EnumValue {
    id: number;
    value: string;
}

export interface Enum {
    id: number;
    name: string;
    values: EnumValue[];
}

export interface LinkColumnSchema {
    id: number;
    name: string;
    data_type: string;
    is_list: boolean;
    constraints: string | null;
    enum_id: number | null;
    required: boolean;
    unique: boolean;
}

export interface LinkTableSchema {
    id: number;
    name: string;
    from_table: string;
    to_table: string;
    columns: LinkColumnSchema[];
}

export interface ColumnSchema {
    id: number;
    name: string;
    data_type: string;
    is_list: boolean;
    constraints: string | null;
    enum_id: number | null;
    required: boolean;
    unique: boolean;
    searchable: boolean;
    reference_link_table_id: number | null;
    reference_table: string | null;
    link_table_columns?: LinkColumnSchema[]; // Optional: To store link table columns
}

export interface TableSchema {
    id: number;
    columns: ColumnSchema[];
    link_tables: LinkTableSchema[];
    display_format: string | null;
    display_format_secondary: string | null;
}

export interface Schema {
    [key: string]: TableSchema;
}

export interface Record {
    id: number;
    table_id: number;
    data: {[key: string]: any};
    created_at: string;
    updated_at: string;
    display_value?: string;
    display_value_secondary?: string;
}

export interface TableRead {
    id: number;
    name: string;
    display_format: string | null;
    display_format_secondary: string | null;
}
