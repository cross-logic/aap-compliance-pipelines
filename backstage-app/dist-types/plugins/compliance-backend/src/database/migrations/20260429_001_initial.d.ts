/**
 * Initial database schema for the compliance backend plugin.
 *
 * Creates four tables:
 *   - compliance_scans: records of scan executions
 *   - compliance_findings: per-host, per-rule finding rows
 *   - compliance_remediation_profiles: saved remediation profiles
 *   - compliance_posture_snapshots: point-in-time compliance scores
 */
import { Knex } from 'knex';
export declare function up(knex: Knex): Promise<void>;
export declare function down(knex: Knex): Promise<void>;
//# sourceMappingURL=20260429_001_initial.d.ts.map