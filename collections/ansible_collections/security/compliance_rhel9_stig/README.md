# Ansible Collection: security.compliance_rhel9_stig

DISA STIG V2R8 compliance cartridge for RHEL 9.

Agentless fact gathering, centralized evaluation, and selective remediation.
No tools installed on target hosts.

## Included Modules

| Module | Description |
|--------|-------------|
| `compliance_gather` | Gather compliance-relevant facts from a target host in a single invocation |
| `compliance_evaluate` | Evaluate gathered facts against STIG/CIS compliance rules centrally |
| `normalize_xccdf` | Normalize OpenSCAP XCCDF results to common compliance findings format |

## Included Playbooks

| Playbook | Description |
|----------|-------------|
| `playbooks/gather_facts.yml` | Gather compliance facts from target hosts |
| `playbooks/evaluate.yml` | Evaluate facts against STIG rules on localhost |
| `playbooks/remediate.yml` | Remediate selected findings on targets |
| `playbooks/scanner/install_scanner.yml` | Ephemerally install OpenSCAP on targets |
| `playbooks/scanner/run_scan.yml` | Run OpenSCAP STIG scan on targets |
| `playbooks/scanner/fetch_results.yml` | Fetch and normalize OpenSCAP results |
| `playbooks/scanner/uninstall_scanner.yml` | Remove OpenSCAP from targets (cleanup) |

## Requirements

- Ansible >= 2.15.0
- RHEL 9 target hosts (for compliance_gather and scanner playbooks)

## Dependencies

- `ansible.posix` >= 1.5.0
- `redhat.rhel_system_roles` >= 1.0.0

## Installation

```bash
ansible-galaxy collection install security.compliance_rhel9_stig
```

## Usage

### Agentless Evaluation (no scanner installed on targets)

```yaml
# 1. Gather facts from targets
- ansible-playbook security.compliance_rhel9_stig.gather_facts -i inventory

# 2. Evaluate facts against STIG rules (runs on localhost)
- ansible-playbook security.compliance_rhel9_stig.evaluate -i inventory

# 3. Remediate selected findings
- ansible-playbook security.compliance_rhel9_stig.remediate -i inventory \
    -e '{"selected_rules": ["sshd_disable_root_login", "enable_fips_mode"]}'
```

### Scanner-based Evaluation (ephemeral OpenSCAP)

```yaml
# Install, scan, fetch results, normalize, then uninstall
- ansible-playbook security.compliance_rhel9_stig.scanner.install_scanner -i inventory
- ansible-playbook security.compliance_rhel9_stig.scanner.run_scan -i inventory
- ansible-playbook security.compliance_rhel9_stig.scanner.fetch_results -i inventory
- ansible-playbook security.compliance_rhel9_stig.scanner.uninstall_scanner -i inventory
```

## License

GPL-3.0-or-later

## Author

Red Hat Ansible Automation Platform
