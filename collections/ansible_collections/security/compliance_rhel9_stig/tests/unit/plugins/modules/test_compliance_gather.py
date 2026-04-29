# GNU General Public License v3.0+

"""Unit tests for compliance_gather module."""

from __future__ import absolute_import, division, print_function
__metaclass__ = type

import json
import os
import pytest
from unittest.mock import patch, mock_open, MagicMock

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


class TestComplianceGatherAllCategories:
    """Test gathering all categories with mocked commands and files."""

    def test_gather_all_default(self):
        """Gathering with default args (all) returns compliance_facts dict."""
        set_module_args({})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, '', '')
            with patch('builtins.open', mock_open(read_data='')):
                with patch('os.path.exists', return_value=False):
                    with patch('os.path.isdir', return_value=False):
                        with patch('os.path.isfile', return_value=False):
                            with pytest.raises(AnsibleExitJson) as exc:
                                compliance_gather.main()

        result = exc.value.args[0]
        assert result['changed'] is False
        assert 'compliance_facts' in result
        assert 'categories_gathered' in result
        assert isinstance(result['compliance_facts'], dict)

    def test_gather_specific_categories(self):
        """Gathering specific categories returns only those categories."""
        set_module_args({'categories': ['packages', 'services']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, '', '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        result = exc.value.args[0]
        assert set(result['categories_gathered']) == {'packages', 'services'}


class TestGatherPackages:
    """Tests for the gather_packages function."""

    def test_packages_parsed(self):
        """RPM output is parsed into name->version dict."""
        set_module_args({'categories': ['packages']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        rpm_output = "bash|5.1.8|6.el9\nopenssl|3.0.7|18.el9\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, rpm_output, '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert 'bash' in facts['packages']
        assert facts['packages']['bash']['version'] == '5.1.8'
        assert facts['packages']['bash']['release'] == '6.el9'
        assert 'openssl' in facts['packages']

    def test_packages_command_failure(self):
        """Non-zero return code returns empty packages dict."""
        set_module_args({'categories': ['packages']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (1, '', 'rpm not found')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['packages'] == {}

    def test_packages_malformed_lines_skipped(self):
        """Malformed RPM output lines are silently skipped."""
        set_module_args({'categories': ['packages']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        rpm_output = "bash|5.1.8|6.el9\nbadline\n|onlytwo|\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, rpm_output, '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert len(facts['packages']) == 1
        assert 'bash' in facts['packages']


class TestGatherServices:
    """Tests for the gather_services function."""

    def test_services_parsed(self):
        """Systemctl output is parsed into service->state dict."""
        set_module_args({'categories': ['services']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        svc_output = "sshd.service enabled enabled\nfirewalld.service disabled disabled\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, svc_output, '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['services']['sshd']['state'] == 'enabled'
        assert facts['services']['firewalld']['state'] == 'disabled'

    def test_services_empty_output(self):
        """Empty systemctl output returns empty services dict."""
        set_module_args({'categories': ['services']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, '', '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['services'] == {}


class TestGatherSysctl:
    """Tests for the gather_sysctl function."""

    def test_sysctl_parsed(self):
        """Sysctl output is parsed into key=value dict."""
        set_module_args({'categories': ['sysctl']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        sysctl_output = "net.ipv4.ip_forward = 0\nkernel.randomize_va_space = 2\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, sysctl_output, '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['sysctl']['net.ipv4.ip_forward'] == '0'
        assert facts['sysctl']['kernel.randomize_va_space'] == '2'


class TestGatherSSHConfig:
    """Tests for the gather_ssh_config function."""

    def test_ssh_config_parsed(self):
        """sshd_config content is parsed into key-value dict."""
        set_module_args({'categories': ['ssh_config']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        sshd_config = "PermitRootLogin no\nClientAliveInterval 600\n# This is a comment\n"
        with patch('builtins.open', mock_open(read_data=sshd_config)):
            with patch('os.path.isdir', return_value=False):
                with pytest.raises(AnsibleExitJson) as exc:
                    compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['ssh_config']['permitrootlogin'] == 'no'
        assert facts['ssh_config']['clientaliveinterval'] == '600'

    def test_ssh_config_file_missing(self):
        """Missing sshd_config returns empty config dict."""
        set_module_args({'categories': ['ssh_config']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch('builtins.open', side_effect=OSError('No such file')):
            with patch('os.path.isdir', return_value=False):
                with pytest.raises(AnsibleExitJson) as exc:
                    compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['ssh_config'] == {}


class TestGatherSELinux:
    """Tests for the gather_selinux function."""

    def test_selinux_enforcing(self):
        """SELinux enforcing mode is detected correctly."""
        set_module_args({'categories': ['selinux']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        selinux_config = "SELINUX=enforcing\nSELINUXTYPE=targeted\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, 'Enforcing\n', '')
            with patch('builtins.open', mock_open(read_data=selinux_config)):
                with pytest.raises(AnsibleExitJson) as exc:
                    compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['selinux']['mode'] == 'Enforcing'
        assert facts['selinux']['config']['SELINUX'] == 'enforcing'


class TestGatherGrub:
    """Tests for the gather_grub function."""

    def test_grub_password_set(self):
        """GRUB password is detected when GRUB2_PASSWORD is present."""
        set_module_args({'categories': ['grub']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch('os.path.exists', return_value=True):
            with patch('builtins.open', mock_open(read_data='GRUB2_PASSWORD=grub.pbkdf2.sha512...')):
                with pytest.raises(AnsibleExitJson) as exc:
                    compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['grub']['password_set'] is True

    def test_grub_no_password(self):
        """GRUB password_set is False when user.cfg does not exist."""
        set_module_args({'categories': ['grub']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch('os.path.exists', return_value=False):
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['grub']['password_set'] is False


class TestGatherCryptoPolicy:
    """Tests for the gather_crypto_policy function."""

    def test_fips_policy(self):
        """FIPS crypto policy is detected."""
        set_module_args({'categories': ['crypto_policy']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, 'FIPS\n', '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['crypto_policy']['current'] == 'FIPS'

    def test_crypto_policy_unknown(self):
        """Failed crypto policy command returns 'unknown'."""
        set_module_args({'categories': ['crypto_policy']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (1, '', 'command not found')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['crypto_policy']['current'] == 'unknown'


class TestGatherUsers:
    """Tests for the gather_users function."""

    def test_users_parsed(self):
        """Users are parsed from /etc/passwd format."""
        set_module_args({'categories': ['users']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        passwd_content = "root:x:0:0:root:/root:/bin/bash\nnobody:x:65534:65534:Nobody:/:/sbin/nologin\n"
        with patch('builtins.open', mock_open(read_data=passwd_content)):
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert len(facts['users']) == 2
        assert facts['users'][0]['name'] == 'root'
        assert facts['users'][0]['uid'] == 0
        assert facts['users'][1]['name'] == 'nobody'

    def test_users_file_missing(self):
        """Missing /etc/passwd returns empty list."""
        set_module_args({'categories': ['users']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch('builtins.open', side_effect=OSError('No such file')):
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert facts['users'] == []


class TestGatherAuditRules:
    """Tests for the gather_audit_rules function."""

    def test_audit_rules_parsed(self):
        """Audit rules are returned as a list of strings."""
        set_module_args({'categories': ['audit_rules']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        audit_output = "-w /etc/passwd -p wa -k identity\n-w /etc/shadow -p wa -k identity\n"
        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, audit_output, '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        facts = exc.value.args[0]['compliance_facts']
        assert len(facts['audit_rules']) == 2
        assert '-w /etc/passwd' in facts['audit_rules'][0]


class TestCheckMode:
    """Tests for check mode behavior."""

    def test_check_mode_returns_unchanged(self):
        """Check mode always returns changed=False."""
        set_module_args({'categories': ['packages'], '_ansible_check_mode': True})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command') as mock_run:
            mock_run.return_value = (0, '', '')
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        result = exc.value.args[0]
        assert result['changed'] is False


class TestErrorHandling:
    """Tests for error handling in fact gathering."""

    def test_category_error_captured(self):
        """Errors in individual categories are captured, not fatal."""
        set_module_args({'categories': ['packages']})

        from ansible_collections.security.compliance_rhel9_stig.plugins.modules import compliance_gather

        with patch.object(basic.AnsibleModule, 'run_command', side_effect=OSError('command not found')):
            with pytest.raises(AnsibleExitJson) as exc:
                compliance_gather.main()

        result = exc.value.args[0]
        assert len(result['errors']) > 0
        assert result['compliance_facts']['packages'] is None
