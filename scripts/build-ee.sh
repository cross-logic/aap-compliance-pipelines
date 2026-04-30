#!/bin/bash
set -euo pipefail

# Build the Compliance STIG RHEL 9 Execution Environment
#
# Prerequisites:
#   - ansible-builder (pip install ansible-builder)
#   - podman or docker
#   - Access to registry.redhat.io (authenticated via podman login)
#
# Usage:
#   ./scripts/build-ee.sh                           # Build with default tag
#   ./scripts/build-ee.sh my-registry/compliance:v1  # Build with custom tag
#   EE_BUILDER=docker ./scripts/build-ee.sh          # Use docker instead of podman

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COLLECTION_DIR="$REPO_ROOT/collections/ansible_collections/security/compliance_rhel9_stig"
EE_FILE="$COLLECTION_DIR/meta/ee_profile.yml"
BUILD_DIR="$REPO_ROOT/build/ee"

TAG="${1:-compliance-stig-rhel9:latest}"
CONTAINER_RUNTIME="${EE_BUILDER:-podman}"

echo "=== Building Compliance STIG RHEL 9 EE ==="
echo "  Tag:       $TAG"
echo "  Runtime:   $CONTAINER_RUNTIME"
echo "  EE file:   $EE_FILE"
echo ""

# Check prerequisites
if ! command -v ansible-builder &> /dev/null; then
    echo "ERROR: ansible-builder not found."
    echo "Install with: pip install ansible-builder"
    exit 1
fi

if ! command -v "$CONTAINER_RUNTIME" &> /dev/null; then
    echo "ERROR: $CONTAINER_RUNTIME not found."
    exit 1
fi

# Prepare build context
echo "=== Preparing build context ==="
mkdir -p "$BUILD_DIR/_build/collections/ansible_collections/security"

# Copy the compliance collection into the build context
# (so the EE has our custom modules without needing Galaxy/Hub)
cp -r "$COLLECTION_DIR" "$BUILD_DIR/_build/collections/ansible_collections/security/compliance_rhel9_stig"
echo "  Copied collection to build context"

# Copy the EE definition
cp "$EE_FILE" "$BUILD_DIR/execution-environment.yml"

# Build
echo ""
echo "=== Building EE ==="
cd "$BUILD_DIR"
ansible-builder build \
    -f execution-environment.yml \
    -t "$TAG" \
    --container-runtime "$CONTAINER_RUNTIME" \
    -v 3

echo ""
echo "=== Build complete ==="
echo "  Image: $TAG"
echo ""
echo "To push to a registry:"
echo "  $CONTAINER_RUNTIME push $TAG"
echo ""
echo "To register in AAP Controller:"
echo "  curl -X POST https://your-aap/api/controller/v2/execution_environments/ \\"
echo "    -H 'Authorization: Bearer \$TOKEN' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"name\": \"Compliance STIG RHEL 9\", \"image\": \"$TAG\", \"organization\": 2}'"
