/**
 * Mock data provider for demo / offline mode.
 *
 * Returns the same data shapes the frontend already expects,
 * so switching from mock to live is transparent.
 */
import type { ComplianceProfile, MultiHostFinding, DashboardStats, LaunchScanResponse, LaunchRemediationResponse, PostureSnapshot, RemediationProfile } from '@aap-compliance/common';
export declare class MockDataProvider {
    private static jobCounter;
    static getProfiles(): ComplianceProfile[];
    static getFindings(): MultiHostFinding[];
    static getInventories(): Array<{
        id: number;
        name: string;
        total_hosts: number;
    }>;
    static getExecutionEnvironments(): Array<{
        id: number;
        name: string;
        image: string;
    }>;
    static getWorkflowTemplates(nameFilter?: string): Array<{
        id: number;
        name: string;
        description: string;
    }>;
    static launchScan(profileId: string): LaunchScanResponse;
    static launchRemediation(): LaunchRemediationResponse;
    static getDashboardStats(): DashboardStats;
    static getPostureHistory(_profileId?: string, _days?: number): PostureSnapshot[];
    static getRemediationProfiles(): RemediationProfile[];
    static saveRemediationProfile(profile: RemediationProfile): RemediationProfile;
}
//# sourceMappingURL=MockDataProvider.d.ts.map