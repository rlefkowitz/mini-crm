
export interface Column {
  id: number;
  table_id: number;
  name: string;
  data_type: string;
  constraints?: string;
}

export interface TableRead {
  id: number;
  name: string;
}

export interface RelationshipAttributeRead {
  id: number;
  name: string;
  data_type: string;
  constraints?: string;
}

export interface RelationshipRead {
  id: number;
  name: string;
  from_table: string;
  to_table: string;
  attributes: RelationshipAttributeRead[];
}

export interface TableSchema {
  [tableName: string]: {
    columns: Column[];
    relationships: {
      from: {
        relationship: string;
        to_table: string;
        attributes: any[];
      }[];
      to: {
        relationship: string;
        from_table: string;
        attributes: any[];
      }[];
    };
  };
}

export interface UserRead {
  id: number;
  name: string;
  email: string;
  company_id?: number;
}

export interface Record {
  id: number;
  [key: string]: any;
}
