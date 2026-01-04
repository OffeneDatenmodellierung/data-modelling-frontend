/**
 * Type definitions for DMN Decision entity
 */

export interface DMNDecision {
  id: string; // UUID
  domain_id: string; // UUID
  name: string; // max 255 chars, unique within domain
  dmn_xml: string; // DMN 1.3 XML content
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp
}

export interface DMNDecisionTable {
  id: string;
  name: string;
  inputs: DMNInput[];
  outputs: DMNOutput[];
  rules: DMNRule[];
}

export interface DMNInput {
  id: string;
  label: string;
  typeRef?: string;
}

export interface DMNOutput {
  id: string;
  label: string;
  typeRef?: string;
}

export interface DMNRule {
  id: string;
  inputEntries: string[];
  outputEntries: string[];
}



