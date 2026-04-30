/**
 * Migration: Cartridge Registry
 *
 * Creates the compliance_cartridge_registry table to store mappings
 * between compliance frameworks and Controller resources (workflow
 * templates, execution environments, remediation playbook paths).
 */
import { Knex } from 'knex';
export declare function up(knex: Knex): Promise<void>;
export declare function down(knex: Knex): Promise<void>;
//# sourceMappingURL=20260429_002_cartridge_registry.d.ts.map