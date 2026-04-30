# Controller Setup for Compliance Pipeline

This guide covers how to configure Ansible Automation Platform (AAP) Controller
with the resources required to run the RHEL 9 STIG compliance pipeline. You can
provision these resources automatically with the setup playbook or create them
manually through the Controller web UI.

## Prerequisites

Before you begin, confirm that you have the following:

| Requirement | Details |
|---|---|
| **AAP version** | 2.5, 2.6, or 2.7 (Automation Controller included) |
| **Admin access** | An account with Organization Admin or Superuser privileges on the Controller |
| **Target host** | A RHEL 9 system reachable via SSH from the Controller execution environment |
| **SSH credentials** | Username and password (or SSH key) with sudo privileges on the target host |
| **Network access** | Controller must be able to reach `github.com` to sync the project repository |

### Required Ansible Collections (for automated setup only)

If you plan to use the automated setup playbook, install these collections on
the machine where you will run the playbook:

```bash
ansible-galaxy collection install infra.aap_configuration
ansible-galaxy collection install ansible.controller
ansible-galaxy collection install ansible.platform
```

These collections are pre-installed in the AAP bundled execution environments.

---

## Resources Created

The compliance pipeline requires the following resources in Controller:

| Resource | Name | Purpose |
|---|---|---|
| Organization | `compliance-prototype` | Isolates all compliance resources |
| Inventory | `compliance-rhel9-inventory` | Contains target RHEL 9 hosts |
| Host | User-provided (e.g., `192.168.128.128`) | The RHEL 9 system to scan |
| Machine Credential | `compliance-lab-ssh` | SSH authentication with sudo |
| Project | `compliance-content` | Git project pointing to the compliance repo |
| Job Template | `compliance-gather-facts` | Collects compliance-relevant facts |
| Job Template | `compliance-evaluate` | Evaluates facts against STIG rules |
| Job Template | `compliance-remediate` | Applies CaC STIG remediation |
| Workflow Job Template | `compliance-pipeline-rhel9-stig` | Chains all three steps |

---

## Option A: Automated Setup

The setup playbook uses `infra.aap_configuration` roles to create all resources
in a single run.

### Required Variables

| Variable | Description | Example |
|---|---|---|
| `controller_host` | AAP Gateway/Controller URL | `https://aap.example.com` |
| `controller_username` | Admin username | `admin` |
| `controller_password` | Admin password | (your password) |
| `target_host` | RHEL 9 host IP or FQDN | `192.168.128.128` |
| `target_ssh_user` | SSH username on the target | `root` |
| `target_ssh_password` | SSH password for the target | (your password) |

### Running the Playbook

From the repository root:

```bash
ansible-playbook \
  collections/ansible_collections/security/compliance_rhel9_stig/playbooks/setup_controller.yml \
  -e controller_host=https://aap.example.com \
  -e controller_username=admin \
  -e controller_password='changeme' \
  -e target_host=192.168.128.128 \
  -e target_ssh_user=root \
  -e target_ssh_password='changeme'
```

You can also set these values as environment variables:

```bash
export CONTROLLER_HOST=https://aap.example.com
export CONTROLLER_USERNAME=admin
export CONTROLLER_PASSWORD=changeme
export TARGET_HOST=192.168.128.128
export TARGET_SSH_USER=root
export TARGET_SSH_PASSWORD=changeme

ansible-playbook \
  collections/ansible_collections/security/compliance_rhel9_stig/playbooks/setup_controller.yml
```

### Expected Output

The playbook runs seven steps in sequence:

1. Creates the `compliance-prototype` organization
2. Creates the `compliance-lab-ssh` machine credential
3. Creates the `compliance-content` project and waits for the initial Git sync
4. Creates the `compliance-rhel9-inventory` inventory
5. Adds the target host to the inventory
6. Creates three job templates (gather-facts, evaluate, remediate)
7. Creates the `compliance-pipeline-rhel9-stig` workflow job template

A summary message is displayed on completion listing all created resources.

### AAP Version Compatibility Notes

- **AAP 2.5+**: The playbook uses the `gateway_organizations` role for
  organization creation (platform-level resource). If the Gateway role is
  unavailable, it falls back to `controller_organizations`.
- **AAP 2.7**: Fully compatible. The `infra.aap_configuration` collection
  handles API differences between versions transparently.
- **Self-signed certificates**: The playbook sets `aap_validate_certs: false`
  by default. For production, configure a trusted certificate and set this
  to `true`.

---

## Option B: Manual Setup

Follow these steps to create all resources through the AAP Controller web UI.

### Step 1: Create the Organization

1. Log in to the AAP Controller web UI as an admin user.
2. Navigate to **Access** > **Organizations** in the left sidebar.
3. Click the **Add** button.
4. Enter the following values:
   - **Name**: `compliance-prototype`
   - **Description**: `Compliance pipeline prototype organization`
5. Click **Save**.

**Expected result**: The organization appears in the Organizations list with a
green status indicator.

### Step 2: Create the Inventory

1. Navigate to **Resources** > **Inventories**.
2. Click **Add** > **Add inventory**.
3. Enter the following values:
   - **Name**: `compliance-rhel9-inventory`
   - **Description**: `RHEL 9 hosts for compliance scanning and remediation`
   - **Organization**: Select `compliance-prototype`
4. Click **Save**.

**Expected result**: The inventory detail page opens showing the Details tab.

### Step 3: Add a Host to the Inventory

1. From the inventory detail page, click the **Hosts** tab.
2. Click the **Add** button.
3. Enter the following values:
   - **Name**: Your target host IP address or FQDN (e.g., `192.168.128.128`)
   - **Variables** (YAML):
     ```yaml
     ansible_host: 192.168.128.128
     ansible_connection: ssh
     ```
4. Click **Save**.

**Expected result**: The host appears in the Hosts tab of the inventory.

### Step 4: Create the Machine Credential

1. Navigate to **Resources** > **Credentials**.
2. Click **Add**.
3. Enter the following values:
   - **Name**: `compliance-lab-ssh`
   - **Description**: `SSH credential for compliance target hosts`
   - **Organization**: Select `compliance-prototype`
   - **Credential Type**: Select **Machine**
4. In the **Type Details** section:
   - **Username**: Your SSH username (e.g., `root`)
   - **Password**: Your SSH password
   - **Privilege Escalation Method**: Select **sudo**
5. Click **Save**.

**Expected result**: The credential appears in the Credentials list. The
password field shows `Encrypted` after saving.

### Step 5: Create the Project

1. Navigate to **Resources** > **Projects**.
2. Click **Add**.
3. Enter the following values:
   - **Name**: `compliance-content`
   - **Description**: `Compliance pipeline collection and playbooks`
   - **Organization**: Select `compliance-prototype`
   - **Source Control Type**: Select **Git**
   - **Source Control URL**: `https://github.com/cross-logic/aap-compliance-pipelines.git`
   - **Source Control Branch/Tag/Commit**: `main`
4. Under **Options**:
   - Check **Clean** (removes local modifications before updating)
   - Check **Update Revision on Launch** (syncs before each job run)
5. Click **Save**.
6. Wait for the initial project sync to complete. The status icon next to the
   project name changes from a spinning icon to a green checkmark.

**Expected result**: The project shows a **Successful** sync status. Clicking
into the project and selecting the **Job Templates** tab shows no templates yet
(you will create them next).

> **If the sync fails**: See the Troubleshooting section at the end of this
> guide.

### Step 6: Create Job Templates

Create each of the three job templates described below. For each template:
navigate to **Resources** > **Templates**, click **Add** > **Add job template**,
fill in the fields, and click **Save**.

#### 6a. compliance-gather-facts

| Field | Value |
|---|---|
| **Name** | `compliance-gather-facts` |
| **Description** | `Gather compliance-relevant facts from target hosts` |
| **Job Type** | Run |
| **Inventory** | `compliance-rhel9-inventory` |
| **Project** | `compliance-content` |
| **Playbook** | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/gather_facts.yml` |
| **Credentials** | `compliance-lab-ssh` |
| **Options** | Check **Privilege Escalation** (Enable become) |
| **Options** | Check **Use Fact Storage** (Enable fact cache) |

#### 6b. compliance-evaluate

| Field | Value |
|---|---|
| **Name** | `compliance-evaluate` |
| **Description** | `Evaluate gathered facts against STIG rules` |
| **Job Type** | Run |
| **Inventory** | `compliance-rhel9-inventory` |
| **Project** | `compliance-content` |
| **Playbook** | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/evaluate.yml` |
| **Credentials** | (none required -- runs on localhost) |
| **Options** | Check **Use Fact Storage** (Enable fact cache) |

> **Note**: The evaluate playbook runs on `localhost` and reads facts from the
> Controller fact cache. It does not need a machine credential because it does
> not SSH to any remote hosts.

#### 6c. compliance-remediate

| Field | Value |
|---|---|
| **Name** | `compliance-remediate` |
| **Description** | `Apply CaC STIG remediation to target hosts` |
| **Job Type** | Run |
| **Inventory** | `compliance-rhel9-inventory` |
| **Project** | `compliance-content` |
| **Playbook** | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/remediate.yml` |
| **Credentials** | `compliance-lab-ssh` |
| **Options** | Check **Privilege Escalation** (Enable become) |

**Expected result**: After creating all three templates, the Templates list
shows `compliance-gather-facts`, `compliance-evaluate`, and
`compliance-remediate` with green status indicators.

### Step 7: Create the Workflow Job Template

1. Navigate to **Resources** > **Templates**.
2. Click **Add** > **Add workflow template**.
3. Enter the following values:
   - **Name**: `compliance-pipeline-rhel9-stig`
   - **Description**: `RHEL 9 STIG compliance pipeline: Gather Facts -> Evaluate -> Remediate`
   - **Organization**: Select `compliance-prototype`
4. Click **Save**.
5. The workflow visualizer opens automatically (or click the **Visualizer** tab).

#### Adding Workflow Nodes

Build the following three-node pipeline:

```
[Gather Facts] --on success--> [Evaluate] --on success--> [Remediate]
```

1. Click the **Start** button in the visualizer.
2. In the dialog that appears:
   - **Node Type**: Job Template
   - Select `compliance-gather-facts`
   - **Convergence**: Any
   - Click **Save**
3. Hover over the **Gather Facts** node and click the green **+** button
   (On Success).
4. In the dialog:
   - **Node Type**: Job Template
   - Select `compliance-evaluate`
   - Click **Save**
5. Hover over the **Evaluate** node and click the green **+** button
   (On Success).
6. In the dialog:
   - **Node Type**: Job Template
   - Select `compliance-remediate`
   - Click **Save**
7. Click **Save** in the visualizer toolbar to persist the workflow.

**Expected result**: The visualizer shows three nodes connected in a linear
chain from left to right: Gather Facts, Evaluate, Remediate.

### Step 8: Add a Compliance Profile in the Plugin (Optional)

If you are using the Backstage compliance plugin, add a compliance profile so the
UI can launch the workflow:

1. Open the Compliance plugin in Backstage.
2. Navigate to the **Settings** tab.
3. Click **Add Profile**.
4. Fill in:
   - **Profile Name**: `DISA STIG for RHEL 9`
   - **Compliance Standard**: `DISA STIG`
   - **Standard Version**: `V2R8`
   - **Target Platform**: `RHEL 9`
   - **Workflow Job Template**: Select `compliance-pipeline-rhel9-stig`
5. Click **Save**.

---

## Verification

After completing either automated or manual setup, verify that everything works:

### 1. Confirm the Project Sync

1. Navigate to **Resources** > **Projects**.
2. The `compliance-content` project should show a green checkmark indicating
   a successful sync.
3. Click into the project and verify the **Last Updated** timestamp is recent.

### 2. Launch a Test Workflow

1. Navigate to **Resources** > **Templates**.
2. Find `compliance-pipeline-rhel9-stig` and click the rocket icon to launch it.
3. If prompted, accept the defaults and click **Launch**.
4. Monitor the workflow progress in the visualizer:
   - **Gather Facts** should complete first (green border).
   - **Evaluate** should start automatically and complete (green border).
   - **Remediate** should start automatically and complete (green border).

### 3. Review Job Output

1. Click on each completed node in the workflow visualizer to view its job
   output.
2. **Gather Facts**: Should show facts being collected from the target host.
3. **Evaluate**: Should show a compliance summary with pass/fail/error counts.
4. **Remediate**: Should show remediation tasks being applied.

### 4. Verify from the Backstage Plugin (if configured)

1. Open the Compliance plugin dashboard.
2. The compliance posture data should reflect the latest scan results.
3. Navigate to the **Scan Results** section to see per-host findings.

---

## Troubleshooting

### Project sync fails with "authentication required"

**Symptom**: The `compliance-content` project shows a red failure status after
sync, with an error about authentication.

**Resolution**: The repository at
`https://github.com/cross-logic/aap-compliance-pipelines.git` is public and does
not require authentication. If your Controller is behind a proxy, configure the
proxy settings in **Settings** > **Jobs** > **Extra Environment Variables**:

```json
{
  "HTTP_PROXY": "http://proxy.example.com:8080",
  "HTTPS_PROXY": "http://proxy.example.com:8080",
  "NO_PROXY": "localhost,127.0.0.1"
}
```

### Project sync fails with "fatal: unsafe repository"

**Symptom**: Git reports `fatal: detected dubious ownership in repository` or
`fatal: unsafe repository`.

**Resolution**: This is a Git `safe.directory` issue. Add the following to
the Controller job settings. Navigate to **Settings** > **Jobs** >
**Extra Environment Variables** and add:

```json
{
  "GIT_CONFIG_COUNT": "1",
  "GIT_CONFIG_KEY_0": "safe.directory",
  "GIT_CONFIG_VALUE_0": "*"
}
```

Alternatively, on the execution node, run:

```bash
git config --global --add safe.directory '*'
```

### SSH connection refused or timeout

**Symptom**: The `compliance-gather-facts` or `compliance-remediate` job fails
with `Connection refused` or `Connection timed out`.

**Resolution**:

1. Verify that the target host is reachable from the Controller execution node:
   ```bash
   ssh <target_ssh_user>@<target_host>
   ```
2. Confirm that the SSH service is running on the target:
   ```bash
   systemctl status sshd
   ```
3. Check that the target host's firewall allows SSH (port 22):
   ```bash
   firewall-cmd --list-services
   ```
4. Verify the credential password is correct by editing the `compliance-lab-ssh`
   credential and re-entering the password.

### Permission denied during remediation (become)

**Symptom**: The `compliance-remediate` job fails with
`Missing sudo password` or `Permission denied`.

**Resolution**:

1. Edit the `compliance-lab-ssh` credential.
2. Confirm that the **Privilege Escalation Method** is set to **sudo**.
3. If the target user requires a sudo password, ensure the **Privilege
   Escalation Password** field is populated (it can be the same as the SSH
   password).
4. On the target host, verify the user has sudo access:
   ```bash
   sudo -l -U <target_ssh_user>
   ```

### Evaluate job fails with "compliance_facts not found"

**Symptom**: The `compliance-evaluate` job fails because
`hostvars[host]['compliance_facts']` is undefined.

**Resolution**: This happens when `compliance-gather-facts` did not run
successfully, or when the fact cache has expired between runs.

1. Re-run the full workflow rather than launching `compliance-evaluate` in
   isolation.
2. In the Controller settings, check the fact cache timeout under
   **Settings** > **Jobs** > **Per-Host Ansible Fact Cache Timeout** and
   increase it if needed (default is 0, meaning no expiration).

### Workflow node shows "Error" without job output

**Symptom**: A workflow node turns red but there is no job output to inspect.

**Resolution**: This typically means the job template could not be launched.
Check:

1. The project sync is successful (the project must be in a "Successful" state).
2. The playbook path is correct and the file exists in the repository.
3. The credential and inventory still exist and have not been deleted.

### Automated setup playbook fails with "module not found"

**Symptom**: Running `setup_controller.yml` produces an error like
`couldn't resolve module/action 'ansible.controller.organization'`.

**Resolution**: Install the required collections:

```bash
ansible-galaxy collection install infra.aap_configuration ansible.controller ansible.platform
```

If running inside an execution environment, ensure it includes these
collections. The standard AAP EEs (`ee-supported-rhel9`) include them by
default.

---

## Appendix: Resource Reference

### Playbook Paths

These paths are relative to the project root
(`aap-compliance-pipelines/`):

| Job Template | Playbook Path |
|---|---|
| compliance-gather-facts | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/gather_facts.yml` |
| compliance-evaluate | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/evaluate.yml` |
| compliance-remediate | `collections/ansible_collections/security/compliance_rhel9_stig/playbooks/remediate.yml` |

### Workflow Topology

```
+-----------------------+     +---------------------+     +---------------------+
| compliance-gather-    |     | compliance-evaluate |     | compliance-         |
| facts                 +---->+                     +---->+ remediate           |
| (become, fact cache)  |  ok | (fact cache)        |  ok | (become)            |
+-----------------------+     +---------------------+     +---------------------+
```

### Setup Playbook Variables Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `controller_host` | `$CONTROLLER_HOST` or `https://aap.example.com` | Yes | AAP Gateway/Controller URL |
| `controller_username` | `$CONTROLLER_USERNAME` or `admin` | Yes | Admin username |
| `controller_password` | `$CONTROLLER_PASSWORD` | Yes | Admin password |
| `target_host` | `$TARGET_HOST` or `192.168.128.128` | Yes | RHEL 9 target host |
| `target_ssh_user` | `$TARGET_SSH_USER` or `root` | Yes | SSH username |
| `target_ssh_password` | `$TARGET_SSH_PASSWORD` | Yes | SSH password |
