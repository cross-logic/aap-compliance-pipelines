# Manual Controller Setup for Compliance Pipeline

Step-by-step instructions for manually configuring the AAP Controller resources
required by the compliance pipeline. Use this guide if you cannot run the
automated `setup_controller.yml` playbook.

## Prerequisites

- AAP Controller 2.6 with admin access
- A container registry accessible from Controller (for the compliance EE)
- SSH access to target RHEL 9 hosts
- The compliance pipeline repository cloned or available as a Git URL

## Step 1: Create Organization

1. Navigate to **Access > Organizations**
2. Click **Add**
3. Name: `compliance-prototype`
4. Save

## Step 2: Create Inventory

1. Navigate to **Resources > Inventories**
2. Click **Add > Add inventory**
3. Name: `compliance-rhel9-inventory`
4. Organization: `compliance-prototype`
5. Save
6. Go to the **Hosts** tab
7. Click **Add** and enter each target host (e.g., `web-prod-01`)

## Step 3: Create Machine Credential

1. Navigate to **Resources > Credentials**
2. Click **Add**
3. Name: `compliance-machine-credential`
4. Organization: `compliance-prototype`
5. Credential Type: **Machine**
6. Username: your SSH user
7. SSH Private Key or Password: enter the authentication material
8. Save

## Step 4: Create Project

1. Navigate to **Resources > Projects**
2. Click **Add**
3. Name: `compliance-content`
4. Organization: `compliance-prototype`
5. Source Control Type: **Git**
6. Source Control URL: your repo URL (e.g., `https://github.com/cross-logic/aap-compliance-pipelines.git`)
7. Source Control Branch: `main`
8. Check **Update Revision on Launch**
9. Save
10. Wait for the project sync to complete (green checkmark)

## Step 5: Register Execution Environment

1. Navigate to **Administration > Execution Environments**
2. Click **Add**
3. Name: `compliance-ee-rhel9`
4. Image: your compliance EE image (e.g., `registry.example.com/compliance-ee-rhel9:latest`)
5. Organization: `compliance-prototype`
6. Save

> **Building the EE**: Use the `meta/ee_profile.yml` from this collection
> with `ansible-builder build` to create the compliance EE image. The EE
> includes `scap-security-guide` and `openscap-scanner` RPMs.

## Step 6: Create Job Templates

Create each of the following job templates:

### 6a. compliance-install-scanner

- Name: `compliance-install-scanner`
- Organization: `compliance-prototype`
- Inventory: `compliance-rhel9-inventory`
- Project: `compliance-content`
- Playbook: `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/scanner/install_scanner.yml`
- Execution Environment: `compliance-ee-rhel9`
- Credentials: `compliance-machine-credential`
- Check **Prompt on launch** for Limit

### 6b. compliance-run-scan

- Name: `compliance-run-scan`
- Organization: `compliance-prototype`
- Inventory: `compliance-rhel9-inventory`
- Project: `compliance-content`
- Playbook: `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/scanner/run_scan.yml`
- Execution Environment: `compliance-ee-rhel9`
- Credentials: `compliance-machine-credential`
- Check **Prompt on launch** for Limit and Variables

### 6c. compliance-fetch-normalize

- Name: `compliance-fetch-normalize`
- Organization: `compliance-prototype`
- Inventory: `compliance-rhel9-inventory`
- Project: `compliance-content`
- Playbook: `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/scanner/fetch_results.yml`
- Execution Environment: `compliance-ee-rhel9`
- Credentials: `compliance-machine-credential`
- Check **Prompt on launch** for Limit

### 6d. compliance-uninstall-scanner

- Name: `compliance-uninstall-scanner`
- Organization: `compliance-prototype`
- Inventory: `compliance-rhel9-inventory`
- Project: `compliance-content`
- Playbook: `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/scanner/uninstall_scanner.yml`
- Execution Environment: `compliance-ee-rhel9`
- Credentials: `compliance-machine-credential`
- Check **Prompt on launch** for Limit

### 6e. compliance-remediate

- Name: `compliance-remediate`
- Organization: `compliance-prototype`
- Inventory: `compliance-rhel9-inventory`
- Project: `compliance-content`
- Playbook: `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/remediate.yml`
- Execution Environment: `compliance-ee-rhel9`
- Credentials: `compliance-machine-credential`
- Check **Prompt on launch** for Limit, Variables, and Tags

> **Note**: The remediate playbook now imports the CaC playbook from
> `/usr/share/scap-security-guide/ansible/rhel9-playbook-stig.yml` inside the
> EE. Selective remediation is achieved via `--tags` (rule IDs) and
> `--extra-vars` (parameter overrides) passed at launch time.

## Step 7: Create Workflow Job Template

1. Navigate to **Resources > Templates**
2. Click **Add > Add workflow template**
3. Name: `compliance-scan-rhel9-stig`
4. Organization: `compliance-prototype`
5. Check **Prompt on launch** for Inventory, Limit, and Variables
6. Save
7. Click **Visualizer** to open the workflow editor

### Workflow node layout

```
Install Scanner -> Run Scan -> Fetch/Normalize -> Uninstall Scanner -> Remediate
                                       |                    ^
                                       |--- (on failure) ---+
```

1. Click **Start** and add `compliance-install-scanner`
   - Convergence: Any
   - Save
2. Hover over Install Scanner, click **+** (On Success)
   - Select `compliance-run-scan`
   - Save
3. Hover over Run Scan, click **+** (On Success)
   - Select `compliance-fetch-normalize`
   - Save
4. Hover over Fetch/Normalize, click **+** (On Success)
   - Select `compliance-uninstall-scanner`
   - Save
5. Hover over Fetch/Normalize, click **+** (On Failure)
   - Select `compliance-uninstall-scanner` (same node -- ensures cleanup)
   - Save
6. Hover over Uninstall Scanner, click **+** (On Success)
   - Select `compliance-remediate`
   - Save
7. Click **Save** on the visualizer

## Step 8: Register Cartridge in Backstage

Once the Controller resources are set up, register a cartridge in the
Backstage compliance plugin so the UI knows how to use them:

1. Open the Compliance plugin in Backstage
2. Go to the **Settings** tab
3. Click **Add Cartridge**
4. Fill in:
   - Display Name: `DISA STIG for RHEL 9`
   - Framework: `DISA STIG`
   - Version: `V2R8`
   - Platform: `RHEL 9`
   - Workflow Template: select `compliance-scan-rhel9-stig`
   - Execution Environment: select `compliance-ee-rhel9`
   - Remediation Playbook Path: `/usr/share/scap-security-guide/ansible/rhel9-playbook-stig.yml`
5. Click **Save**

## Verification

1. Go to the **New Scan** tab
2. You should see the cartridge-sourced profile in the profile list
3. Select it, choose an inventory, and launch a scan
4. The scan should use the mapped workflow template from the cartridge

## Automated Setup

For automated provisioning, run the setup playbook instead:

```bash
ansible-playbook collections/ansible_collections/security/compliance_rhel9_stig/playbooks/setup_controller.yml \
  -e controller_hostname=https://aap.example.com \
  -e controller_username=admin \
  -e controller_password=<changeme> \
  -e target_hosts="host1,host2,host3" \
  -e machine_credential_user=ec2-user \
  -e machine_credential_ssh_key_data=@~/.ssh/id_rsa \
  -e compliance_ee_image=registry.example.com/compliance-ee-rhel9:latest
```
