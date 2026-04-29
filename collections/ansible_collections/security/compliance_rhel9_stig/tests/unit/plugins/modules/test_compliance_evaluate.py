# GNU General Public License v3.0+

"""Unit tests for compliance_evaluate module."""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import json
import pytest
from unittest.mock import patch

from ansible.module_utils import basic
from ansible.module_utils.common.text.converters import to_bytes


def set_module_args(args):
    """Prepare module args for AnsibleModule instantiation."""
    args = json.dumps({'ANSIBLE_MODULE_ARGS': args})
    basic._ANSIBLE_ARGS = to_bytes(args)


class AnsibleExitJson(Exception):
    """Exception class for capturing module.exit_json calls."""
    pass


class AnsibleFailJson(Exception):
    """Exception class for capturing module.fail_json calls."""
    pass


def exit_json(*args, **kwargs):
    """Replacement for AnsibleModule.exit_json that raises an exception."""
    if 'changed' not in kwargs:
        kwargs['changed'] = False
    raise AnsibleExitJson(kwargs)


def fail_json(*args, **kwargs):
    """Replacement for AnsibleModule.fail_json that raises an exception."""
    kwargs['failed'] = True
    raise AnsibleFailJson(kwargs)


@pytest.fixture(autouse=True)
def patch_module():
    """Patch AnsibleModule exit/fail methods for all tests."""
    with patch.object(basic.AnsibleModule, 'exit_json', exit_json):
        with patch.object(basic.AnsibleModule, 'fail_json', fail_json):
            yield


# ---------------------------------------------------------------------------
# Shared test data
# ---------------------------------------------------------------------------

SAMPLE_FACTS = {
    'packages': {
        'openssl': {'version': '3.0.7', 'release': '18.el9'},
        'bash': {'version': '5.1.8', 'release': '6.el9'},
    },
    'services': {
        'sshd': {'state': 'enabled'},
        'firewalld': {'state': 'enabled'},
        'telnet': {'state': 'disabled'},
        'rsh': {'state': 'masked'},
    },
    'sysctl': {
        'net.ipv4.ip_forward': '0',
        'kernel.randomize_va_space': '2',
        'net.ipv4.conf.all.send_redirects': '0',
    },
    'ssh_config': {
        'permitrootlogin': 'no',
        'clientaliveinterval': '600',
        'protocol': '2',
        'x11forwarding': 'no',
    },
    'files': {
        '/etc/passwd': {
            'exists': True,
            'mode': '0644',
            'uid': 0,
            'gid': 0,
            'content': 'root:x:0:0:root:/root:/bin/bash\n',
        },
        '/etc/shadow': {
            'exists': True,
            'mode': '0000',
            'uid': 0,
            'gid': 0,
        },
        '/etc/profile': {
            'exists': True,
            'mode': '0644',
            'uid': 0,
            'gid': 0,
            'content': 'export TMOUT=900\nreadonly TMOUT\n',
        },
        '/etc/pam.d/system-auth': {
            'exists': True,
            'mode': '0644',
            'content': 'auth required pam_unix.so\n',
        },
        '/etc/pam.d/password-auth': {
            'exists': True,
            'mode': '0644',
            'content': 'auth required pam_unix.so\n',
        },
    },
    'crypto_policy': {
        'current': 'FIPS',
    },
    'selinux': {
        'mode': 'Enforcing',
        'config': {'SELINUX': 'enforcing'},
    },
    'grub': {
        'password_set': True,
    },
    'mounts': [
        {'mountpoint': '/tmp', 'options': ['nodev', 'nosuid', 'noexec']},
        {'mountpoint': '/', 'options': ['defaults']},
    ],
    'audit_rules': [
        '-w /etc/passwd -p wa -k identity',
        '-w /etc/shadow -p wa -k identity',
        '-a always,exit -F arch=b64 -S execve -k exec',
    ],
    'users': [
        {'name': 'root', 'uid': 0, 'gid': 0, 'home': '/root', 'shell': '/bin/bash'},
    ],
}


def make_rule(rule_id, check_type, category, params, **kwargs):
    """Helper to construct a rule dict for testing."""
    rule = {
        'id': rule_id,
        'title': kwargs.get('title', f'Test rule {rule_id}'),
        'severity': kwargs.get('severity', 'medium'),
        'check': {
            'category': category,
            'type': check_type,
            'params': params,
        },
    }
    rule.update({k: v for k, v in kwargs.items() if k not in ('title', 'severity')})
    return rule


class TestPackageInstalled:
    """Tests for package_installed check type."""

    def test_package_installed_pass(self):
        """Installed package passes the check."""
        rules = [make_rule('pkg1', 'package_installed', 'packages', {'name': 'openssl'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_package_installed_fail(self):
        """Missing package fails the check."""
        rules = [make_rule('pkg2', 'package_installed', 'packages', {'name': 'nonexistent'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestPackageNotInstalled:
    """Tests for package_not_installed check type."""

    def test_package_not_installed_pass(self):
        """Package not installed correctly passes."""
        rules = [make_rule('pkg3', 'package_not_installed', 'packages', {'name': 'telnet-server'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_package_not_installed_fail(self):
        """Installed package that should not be present fails."""
        rules = [make_rule('pkg4', 'package_not_installed', 'packages', {'name': 'openssl'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestServiceEnabled:
    """Tests for service_enabled check type."""

    def test_service_enabled_pass(self):
        """Enabled service passes."""
        rules = [make_rule('svc1', 'service_enabled', 'services', {'name': 'sshd'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_service_enabled_fail(self):
        """Disabled service fails the enabled check."""
        rules = [make_rule('svc2', 'service_enabled', 'services', {'name': 'telnet'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestServiceDisabled:
    """Tests for service_disabled check type."""

    def test_service_disabled_pass(self):
        """Disabled service passes the disabled check."""
        rules = [make_rule('svc3', 'service_disabled', 'services', {'name': 'telnet'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_service_disabled_masked_pass(self):
        """Masked service passes the disabled check."""
        rules = [make_rule('svc4', 'service_disabled', 'services', {'name': 'rsh'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_service_disabled_fail(self):
        """Enabled service fails the disabled check."""
        rules = [make_rule('svc5', 'service_disabled', 'services', {'name': 'sshd'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_service_not_found_passes_disabled(self):
        """Service not found passes the disabled check (not found = disabled)."""
        rules = [make_rule('svc6', 'service_disabled', 'services', {'name': 'nonexistent_svc'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'


class TestSysctlValue:
    """Tests for sysctl_value check type."""

    def test_sysctl_value_pass(self):
        """Matching sysctl value passes."""
        rules = [make_rule('sys1', 'sysctl_value', 'sysctl',
                           {'key': 'net.ipv4.ip_forward', 'value': '0'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_sysctl_value_fail(self):
        """Non-matching sysctl value fails."""
        rules = [make_rule('sys2', 'sysctl_value', 'sysctl',
                           {'key': 'net.ipv4.ip_forward', 'value': '1'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_sysctl_missing_key(self):
        """Missing sysctl key fails (empty string != expected)."""
        rules = [make_rule('sys3', 'sysctl_value', 'sysctl',
                           {'key': 'nonexistent.key', 'value': '1'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestSSHConfig:
    """Tests for ssh_config check type."""

    def test_ssh_config_pass(self):
        """Matching SSH config value passes."""
        rules = [make_rule('ssh1', 'ssh_config', 'ssh_config',
                           {'key': 'PermitRootLogin', 'value': 'no'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_ssh_config_case_insensitive(self):
        """SSH config comparison is case-insensitive."""
        rules = [make_rule('ssh2', 'ssh_config', 'ssh_config',
                           {'key': 'PERMITROOTLOGIN', 'value': 'NO'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_ssh_config_fail(self):
        """Non-matching SSH config value fails."""
        rules = [make_rule('ssh3', 'ssh_config', 'ssh_config',
                           {'key': 'PermitRootLogin', 'value': 'yes'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestFilePermissions:
    """Tests for file_permissions check type."""

    def test_file_permissions_pass(self):
        """File with permissions at or below max passes."""
        rules = [make_rule('fp1', 'file_permissions', 'files',
                           {'path': '/etc/passwd', 'max_mode': '0644'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_file_permissions_strict_pass(self):
        """File with stricter permissions than max passes."""
        rules = [make_rule('fp2', 'file_permissions', 'files',
                           {'path': '/etc/shadow', 'max_mode': '0600'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_file_permissions_fail(self):
        """File with permissions above max fails."""
        rules = [make_rule('fp3', 'file_permissions', 'files',
                           {'path': '/etc/passwd', 'max_mode': '0600'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_file_permissions_missing_file(self):
        """Missing file fails the permissions check."""
        rules = [make_rule('fp4', 'file_permissions', 'files',
                           {'path': '/etc/nonexistent', 'max_mode': '0644'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestFileContains:
    """Tests for file_contains check type."""

    def test_file_contains_pass(self):
        """File containing expected pattern passes."""
        rules = [make_rule('fc1', 'file_contains', 'files',
                           {'path': '/etc/profile', 'pattern': r'TMOUT=\d+'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_file_contains_fail(self):
        """File not containing expected pattern fails."""
        rules = [make_rule('fc2', 'file_contains', 'files',
                           {'path': '/etc/profile', 'pattern': r'NONEXISTENT_VAR'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_file_contains_no_content(self):
        """File with no content attribute fails."""
        facts_no_content = dict(SAMPLE_FACTS)
        facts_no_content['files'] = {'/etc/empty': {'exists': True, 'mode': '0644'}}
        rules = [make_rule('fc3', 'file_contains', 'files',
                           {'path': '/etc/empty', 'pattern': r'anything'})]
        set_module_args({'facts': facts_no_content, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestFileNotContains:
    """Tests for file_not_contains check type."""

    def test_file_not_contains_pass(self):
        """File not containing undesired pattern passes."""
        rules = [make_rule('fnc1', 'file_not_contains', 'files',
                           {'path': '/etc/profile', 'pattern': r'INSECURE_SETTING'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_file_not_contains_fail(self):
        """File containing undesired pattern fails."""
        rules = [make_rule('fnc2', 'file_not_contains', 'files',
                           {'path': '/etc/profile', 'pattern': r'TMOUT'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestCryptoPolicy:
    """Tests for crypto_policy check type."""

    def test_crypto_policy_pass(self):
        """Matching crypto policy passes."""
        rules = [make_rule('cp1', 'crypto_policy', 'crypto_policy', {'policy': 'FIPS'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_crypto_policy_fail(self):
        """Non-matching crypto policy fails."""
        rules = [make_rule('cp2', 'crypto_policy', 'crypto_policy', {'policy': 'DEFAULT'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_crypto_policy_case_insensitive(self):
        """Crypto policy comparison is case-insensitive."""
        rules = [make_rule('cp3', 'crypto_policy', 'crypto_policy', {'policy': 'fips'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'


class TestSELinuxEnforcing:
    """Tests for selinux_enforcing check type."""

    def test_selinux_enforcing_pass(self):
        """SELinux in enforcing mode passes."""
        rules = [make_rule('se1', 'selinux_enforcing', 'selinux', {})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_selinux_permissive_fail(self):
        """SELinux in permissive mode fails."""
        facts = dict(SAMPLE_FACTS)
        facts['selinux'] = {'mode': 'Permissive', 'config': {}}
        rules = [make_rule('se2', 'selinux_enforcing', 'selinux', {})]
        set_module_args({'facts': facts, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestGrubPassword:
    """Tests for grub_password check type."""

    def test_grub_password_set_pass(self):
        """GRUB password set passes."""
        rules = [make_rule('gp1', 'grub_password', 'grub', {})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_grub_password_not_set_fail(self):
        """GRUB password not set fails."""
        facts = dict(SAMPLE_FACTS)
        facts['grub'] = {'password_set': False}
        rules = [make_rule('gp2', 'grub_password', 'grub', {})]
        set_module_args({'facts': facts, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestMountOption:
    """Tests for mount_option check type."""

    def test_mount_option_present_pass(self):
        """Mount with required option passes."""
        rules = [make_rule('mo1', 'mount_option', 'mounts',
                           {'mountpoint': '/tmp', 'option': 'noexec'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_mount_option_missing_fail(self):
        """Mount without required option fails."""
        rules = [make_rule('mo2', 'mount_option', 'mounts',
                           {'mountpoint': '/', 'option': 'noexec'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_mount_not_found_fail(self):
        """Mountpoint not found fails."""
        rules = [make_rule('mo3', 'mount_option', 'mounts',
                           {'mountpoint': '/nonexistent', 'option': 'noexec'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'

    def test_mount_option_string_options(self):
        """Mount with options as comma-separated string is handled."""
        facts = dict(SAMPLE_FACTS)
        facts['mounts'] = [
            {'mountpoint': '/var', 'options': 'rw,nosuid,nodev'},
        ]
        rules = [make_rule('mo4', 'mount_option', 'mounts',
                           {'mountpoint': '/var', 'option': 'nosuid'})]
        set_module_args({'facts': facts, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'


class TestAuditRuleExists:
    """Tests for audit_rule_exists check type."""

    def test_audit_rule_found_pass(self):
        """Matching audit rule passes."""
        rules = [make_rule('ar1', 'audit_rule_exists', 'audit_rules',
                           {'pattern': r'/etc/passwd.*identity'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_audit_rule_not_found_fail(self):
        """Missing audit rule fails."""
        rules = [make_rule('ar2', 'audit_rule_exists', 'audit_rules',
                           {'pattern': r'nonexistent_rule'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestNoEmptyPasswords:
    """Tests for no_empty_passwords check type."""

    def test_no_nullok_pass(self):
        """PAM config without nullok passes."""
        rules = [make_rule('nep1', 'no_empty_passwords', 'users', {})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'pass'

    def test_nullok_present_fail(self):
        """PAM config with nullok fails."""
        facts = dict(SAMPLE_FACTS)
        facts['files'] = dict(facts['files'])
        facts['files']['/etc/pam.d/system-auth'] = {
            'exists': True,
            'content': 'auth sufficient pam_unix.so nullok try_first_pass\n',
        }
        rules = [make_rule('nep2', 'no_empty_passwords', 'users', {})]
        set_module_args({'facts': facts, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'fail'


class TestUnknownCheckType:
    """Tests for unknown check types."""

    def test_unknown_check_type_error(self):
        """Unknown check type returns error status."""
        rules = [make_rule('unk1', 'bogus_check_type', 'packages', {})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'error'
        assert 'Unknown check type' in findings[0]['evidence']


class TestMissingCategory:
    """Tests for missing fact categories."""

    def test_missing_category_error(self):
        """Rule referencing missing category returns error status."""
        rules = [make_rule('mc1', 'package_installed', 'nonexistent_category',
                           {'name': 'test'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        findings = exc.value.args[0]['findings']
        assert findings[0]['status'] == 'error'
        assert 'not available' in findings[0]['evidence']


class TestSummary:
    """Tests for the summary output."""

    def test_summary_counts(self):
        """Summary correctly counts pass, fail, and error statuses."""
        rules = [
            make_rule('s1', 'package_installed', 'packages', {'name': 'openssl'}),
            make_rule('s2', 'package_installed', 'packages', {'name': 'nonexistent'}),
            make_rule('s3', 'bogus_type', 'packages', {}),
        ]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        summary = exc.value.args[0]['summary']
        assert summary['total'] == 3
        assert summary['pass'] == 1
        assert summary['fail'] == 1
        assert summary['error'] == 1

    def test_empty_rules(self):
        """Empty rules list produces empty findings and zero summary."""
        set_module_args({'facts': SAMPLE_FACTS, 'rules': [], 'host': 'test01'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        result = exc.value.args[0]
        assert result['findings'] == []
        assert result['summary']['total'] == 0


class TestFindingMetadata:
    """Tests for finding metadata fields."""

    def test_finding_includes_rule_metadata(self):
        """Finding includes rule_id, stig_id, title, severity, etc."""
        rules = [make_rule('meta1', 'package_installed', 'packages',
                           {'name': 'openssl'},
                           stig_id='V-123456', title='Test Rule',
                           severity='high', fix_text='Fix it',
                           check_text='Check it')]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'testhost',
                         'profile': 'stig'})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        finding = exc.value.args[0]['findings'][0]
        assert finding['rule_id'] == 'meta1'
        assert finding['stig_id'] == 'V-123456'
        assert finding['title'] == 'Test Rule'
        assert finding['severity'] == 'high'
        assert finding['host'] == 'testhost'
        assert finding['profile'] == 'stig'
        assert finding['fix_text'] == 'Fix it'
        assert finding['check_text'] == 'Check it'


class TestCheckMode:
    """Tests for check mode behavior."""

    def test_check_mode_returns_unchanged(self):
        """Check mode returns changed=False and still evaluates."""
        rules = [make_rule('cm1', 'package_installed', 'packages', {'name': 'openssl'})]
        set_module_args({'facts': SAMPLE_FACTS, 'rules': rules, 'host': 'test01',
                         '_ansible_check_mode': True})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_evaluate

        with pytest.raises(AnsibleExitJson) as exc:
            compliance_evaluate.main()

        result = exc.value.args[0]
        assert result['changed'] is False
        assert len(result['findings']) == 1
