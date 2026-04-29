# Remediation Profile Builder

The Remediation Profile Builder enables users to selectively configure which compliance rules to remediate, with per-rule scope and parameter controls.

## User Flow

1. User views scan results in the Results Viewer
2. User clicks "Build Remediation Profile" to enter the builder
3. Builder shows all rules with failures, grouped by severity (CAT I, CAT II, CAT III)
4. User toggles individual rules on/off, configures scope and parameters
5. User either saves the profile for reuse or applies remediation immediately

## Key Features

### Rule Selection

Each rule is displayed as a card with:
- Toggle switch to enable/disable
- STIG ID and rule title
- Host failure count (e.g., "2 failed / 20 hosts")
- High-disruption warning badge where applicable

### Bulk Actions

The summary bar provides bulk selection buttons:
- **Select All** -- enable all rules
- **CAT I Only** -- enable only critical severity
- **CAT I + II** -- enable critical and medium
- **Clear All** -- disable all rules

### Scope Configuration

For each enabled rule, users choose a remediation scope:
- **Failed hosts only** -- apply fix only to hosts that failed the rule
- **Standardize all** -- apply the fix to all hosts for consistency

When only a few hosts fail out of many, the builder shows a "homogeneity advice" banner suggesting the failing hosts may belong in a different inventory group.

### Parameter Overrides

Rules with tunable parameters (e.g., SSH timeout interval, crypto policy) expose form fields for customization. Parameter types include text, number, and dropdown select.

### Save as Profile

Users can save their selections, scope choices, and parameter overrides as a named profile. Saved profiles capture institutional knowledge about which rules to enforce and what values to apply. This enables consistent remediation across teams and environments.

## After the Builder

From the builder, users can:
- **Save as Profile** -- persist selections for reuse
- **Apply Remediation** -- proceed to the Remediation Execution view, which runs the actual Ansible playbooks via AAP Controller
