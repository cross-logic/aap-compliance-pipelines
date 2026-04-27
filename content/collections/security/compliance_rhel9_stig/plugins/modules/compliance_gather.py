#!/usr/bin/python
# -*- coding: utf-8 -*-

# GNU General Public License v3.0+

DOCUMENTATION = r'''
---
module: compliance_gather
short_description: Gather compliance-relevant facts from a target host in a single invocation
description:
  - Collects all data needed for STIG/CIS compliance evaluation in one SSH round-trip.
  - No tools are installed on the target. This module is transferred via SSH, executed, and removed.
  - Returns structured JSON organized by category for consumption by compliance_evaluate.
version_added: "0.1.0"
options:
  categories:
    description:
      - List of fact categories to gather. Use 'all' for everything.
    type: list
    elements: str
    default: ['all']
    choices:
      - all
      - packages
      - services
      - sysctl
      - files
      - users
      - groups
      - mounts
      - audit_rules
      - ssh_config
      - pam_config
      - crypto_policy
      - selinux
      - firewall
      - grub
      - login_banner
author:
  - Red Hat Ansible Automation Platform
'''

RETURN = r'''
compliance_facts:
  description: Structured compliance facts organized by category
  returned: always
  type: dict
'''

import os
import re
import subprocess
import json

from ansible.module_utils.basic import AnsibleModule


def gather_packages(module):
    rc, stdout, stderr = module.run_command(['rpm', '-qa', '--queryformat', '%{NAME}|%{VERSION}|%{RELEASE}\n'])
    packages = {}
    if rc == 0:
        for line in stdout.strip().split('\n'):
            parts = line.split('|')
            if len(parts) == 3:
                packages[parts[0]] = {'version': parts[1], 'release': parts[2]}
    return packages


def gather_services(module):
    rc, stdout, stderr = module.run_command(['systemctl', 'list-unit-files', '--type=service', '--no-pager', '--no-legend'])
    services = {}
    if rc == 0:
        for line in stdout.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 2:
                name = parts[0].replace('.service', '')
                services[name] = {'state': parts[1]}
    return services


def gather_sysctl(module):
    rc, stdout, stderr = module.run_command(['sysctl', '-a'])
    params = {}
    if rc == 0:
        for line in stdout.strip().split('\n'):
            if '=' in line:
                key, _, value = line.partition('=')
                params[key.strip()] = value.strip()
    return params


def gather_files(module):
    critical_files = [
        '/etc/passwd', '/etc/shadow', '/etc/group', '/etc/gshadow',
        '/etc/ssh/sshd_config', '/etc/pam.d/system-auth', '/etc/pam.d/password-auth',
        '/etc/security/pwquality.conf', '/etc/login.defs', '/etc/profile',
        '/etc/bashrc', '/etc/issue', '/etc/issue.net', '/etc/motd',
        '/etc/crypto-policies/config', '/etc/fstab', '/etc/audit/auditd.conf',
        '/etc/audit/audit.rules', '/boot/grub2/grub.cfg', '/boot/grub2/user.cfg',
    ]
    files = {}
    for path in critical_files:
        info = {'exists': os.path.exists(path)}
        if info['exists']:
            try:
                stat = os.stat(path)
                info['mode'] = oct(stat.st_mode)[-4:]
                info['uid'] = stat.st_uid
                info['gid'] = stat.st_gid
                info['size'] = stat.st_size
                if os.path.isfile(path) and stat.st_size < 65536:
                    with open(path, 'r', errors='replace') as f:
                        info['content'] = f.read()
            except (OSError, IOError):
                info['error'] = 'permission denied'
        files[path] = info
    return files


def gather_users(module):
    users = []
    try:
        with open('/etc/passwd', 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) >= 7:
                    users.append({
                        'name': parts[0],
                        'uid': int(parts[2]),
                        'gid': int(parts[3]),
                        'home': parts[5],
                        'shell': parts[6],
                    })
    except (OSError, IOError):
        pass
    return users


def gather_groups(module):
    groups = []
    try:
        with open('/etc/group', 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) >= 4:
                    groups.append({
                        'name': parts[0],
                        'gid': int(parts[2]),
                        'members': parts[3].split(',') if parts[3] else [],
                    })
    except (OSError, IOError):
        pass
    return groups


def gather_mounts(module):
    rc, stdout, stderr = module.run_command(['findmnt', '--json', '--noheadings'])
    if rc == 0:
        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            pass
    mounts = []
    try:
        with open('/proc/mounts', 'r') as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 4:
                    mounts.append({
                        'device': parts[0],
                        'mountpoint': parts[1],
                        'fstype': parts[2],
                        'options': parts[3].split(','),
                    })
    except (OSError, IOError):
        pass
    return mounts


def gather_audit_rules(module):
    rc, stdout, stderr = module.run_command(['auditctl', '-l'])
    rules = []
    if rc == 0:
        rules = [line.strip() for line in stdout.strip().split('\n') if line.strip()]
    return rules


def gather_ssh_config(module):
    config = {}
    try:
        with open('/etc/ssh/sshd_config', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split(None, 1)
                    if len(parts) == 2:
                        config[parts[0].lower()] = parts[1]
    except (OSError, IOError):
        pass
    # Also check sshd_config.d/
    config_d = '/etc/ssh/sshd_config.d'
    if os.path.isdir(config_d):
        for fname in sorted(os.listdir(config_d)):
            if fname.endswith('.conf'):
                try:
                    with open(os.path.join(config_d, fname), 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#'):
                                parts = line.split(None, 1)
                                if len(parts) == 2:
                                    config[parts[0].lower()] = parts[1]
                except (OSError, IOError):
                    pass
    return config


def gather_pam_config(module):
    pam = {}
    for pam_file in ['system-auth', 'password-auth', 'postlogin']:
        path = f'/etc/pam.d/{pam_file}'
        try:
            with open(path, 'r') as f:
                pam[pam_file] = f.read()
        except (OSError, IOError):
            pam[pam_file] = None
    return pam


def gather_crypto_policy(module):
    rc, stdout, stderr = module.run_command(['update-crypto-policies', '--show'])
    return {'current': stdout.strip() if rc == 0 else 'unknown'}


def gather_selinux(module):
    rc, stdout, stderr = module.run_command(['getenforce'])
    mode = stdout.strip() if rc == 0 else 'unknown'
    config = {}
    try:
        with open('/etc/selinux/config', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, _, value = line.partition('=')
                    config[key.strip()] = value.strip()
    except (OSError, IOError):
        pass
    return {'mode': mode, 'config': config}


def gather_firewall(module):
    rc, stdout, stderr = module.run_command(['firewall-cmd', '--list-all', '--zone=public'])
    return {'public_zone': stdout.strip() if rc == 0 else 'unavailable'}


def gather_grub(module):
    grub = {'password_set': False}
    if os.path.exists('/boot/grub2/user.cfg'):
        try:
            with open('/boot/grub2/user.cfg', 'r') as f:
                content = f.read()
                grub['password_set'] = 'GRUB2_PASSWORD' in content
        except (OSError, IOError):
            pass
    return grub


def gather_login_banner(module):
    banner = {}
    for path in ['/etc/issue', '/etc/issue.net', '/etc/motd']:
        try:
            with open(path, 'r') as f:
                banner[os.path.basename(path)] = f.read().strip()
        except (OSError, IOError):
            banner[os.path.basename(path)] = None
    return banner


CATEGORY_MAP = {
    'packages': gather_packages,
    'services': gather_services,
    'sysctl': gather_sysctl,
    'files': gather_files,
    'users': gather_users,
    'groups': gather_groups,
    'mounts': gather_mounts,
    'audit_rules': gather_audit_rules,
    'ssh_config': gather_ssh_config,
    'pam_config': gather_pam_config,
    'crypto_policy': gather_crypto_policy,
    'selinux': gather_selinux,
    'firewall': gather_firewall,
    'grub': gather_grub,
    'login_banner': gather_login_banner,
}


def main():
    module = AnsibleModule(
        argument_spec=dict(
            categories=dict(type='list', elements='str', default=['all']),
        ),
        supports_check_mode=True,
    )

    categories = module.params['categories']
    if 'all' in categories:
        categories = list(CATEGORY_MAP.keys())

    facts = {}
    errors = []

    for category in categories:
        if category in CATEGORY_MAP:
            try:
                facts[category] = CATEGORY_MAP[category](module)
            except Exception as e:
                errors.append(f'{category}: {str(e)}')
                facts[category] = None

    module.exit_json(
        changed=False,
        compliance_facts=facts,
        errors=errors,
        categories_gathered=list(facts.keys()),
    )


if __name__ == '__main__':
    main()
