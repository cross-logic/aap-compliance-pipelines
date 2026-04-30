/**
 * Knex-based data access layer for compliance plugin persistence.
 */
import { Knex } from 'knex';
import type { ComplianceScan, StoredFinding, PostureSnapshot, RemediationProfile, RemediationSelection, ComplianceCartridge, SaveCartridgeRequest } from '@aap-compliance/common';
export declare class ComplianceDatabase {
    private readonly db;
    constructor(db: Knex);
    createScan(scan: Omit<ComplianceScan, 'id'>): Promise<ComplianceScan>;
    updateScanStatus(scanId: string, status: string, completedAt?: string): Promise<void>;
    getRecentScans(limit?: number): Promise<ComplianceScan[]>;
    private mapScanRow;
    saveScanResults(scan: Omit<ComplianceScan, 'id'>, findings: Array<Omit<StoredFinding, 'id'>>): Promise<{
        scanId: string;
        findingCount: number;
    }>;
    getLatestFindings(profileId?: string): Promise<StoredFinding[]>;
    getFindingsByScanId(scanId: string): Promise<StoredFinding[]>;
    private mapFindingRow;
    savePostureSnapshot(snapshot: Omit<PostureSnapshot, 'id'>): Promise<PostureSnapshot>;
    getPostureHistory(profileId: string, days?: number): Promise<PostureSnapshot[]>;
    private mapPostureRow;
    saveRemediationProfile(profile: {
        name: string;
        description: string;
        profileId: string;
        selections: RemediationSelection[];
    }): Promise<{
        id: string;
    }>;
    listRemediationProfiles(): Promise<RemediationProfile[]>;
    getRemediationProfile(id: string): Promise<RemediationProfile | null>;
    private mapRemediationProfileRow;
    listCartridges(): Promise<ComplianceCartridge[]>;
    getCartridge(id: string): Promise<ComplianceCartridge | null>;
    saveCartridge(cartridge: SaveCartridgeRequest): Promise<ComplianceCartridge>;
    deleteCartridge(id: string): Promise<boolean>;
    private mapCartridgeRow;
}
//# sourceMappingURL=ComplianceDatabase.d.ts.map