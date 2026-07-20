#!/usr/bin/env bash
# =============================================================================
# deploy-k8s.sh — OSRM Kubernetes Full Deployment Automation
# =============================================================================
#
# Deploys the OSRM routing engine to Kubernetes for the Nigerian Real Estate
# Platform. Handles:
#   1. Namespace creation
#   2. S3 credentials secret (for OSM data download and pre-processed file storage)
#   3. PersistentVolumeClaim for OSRM data
#   4. One-time data pre-processing Job (downloads Nigeria OSM → runs osrm-extract,
#      osrm-partition, osrm-customize, uploads result to S3)
#   5. Deployment of OSRM HTTP backend
#   6. Readiness polling and health checks
#   7. Summary report
#
# Usage:
#   ./deploy-k8s.sh [OPTIONS]
#
# Options:
#   -b, --s3-bucket       S3 bucket name for OSRM data (required)
#   -k, --s3-access-key   AWS/MinIO access key ID (required)
#   -s, --s3-secret-key   AWS/MinIO secret access key (required)
#   -r, --aws-region      AWS region (default: us-east-1)
#   -e, --s3-endpoint     Custom S3 endpoint URL (for MinIO; optional)
#   -n, --namespace       Kubernetes namespace (default: geo)
#   -c, --context         Kubernetes context to use (default: current context)
#   -f, --force-preprocess  Force re-run of the pre-processing Job even if data exists
#   -w, --wait-timeout    Seconds to wait for pods to be ready (default: 600)
#   -h, --help            Show this help
#
# Examples:
#   # Deploy to production with AWS S3
#   ./deploy-k8s.sh \
#     --s3-bucket realestate-ng-osrm \
#     --s3-access-key AKIAIOSFODNN7EXAMPLE \
#     --s3-secret-key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
#     --aws-region us-east-1
#
#   # Deploy with local MinIO
#   ./deploy-k8s.sh \
#     --s3-bucket osrm-data \
#     --s3-access-key minioadmin \
#     --s3-secret-key minioadmin \
#     --s3-endpoint http://minio.storage.svc.cluster.local:9000 \
#     --namespace geo
#
# =============================================================================
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${BLUE}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${CYAN}${BOLD}▶ $*${RESET}"; }

# ── Defaults ──────────────────────────────────────────────────────────────────
S3_BUCKET=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
AWS_REGION="us-east-1"
S3_ENDPOINT=""
NAMESPACE="geo"
KUBE_CONTEXT=""
FORCE_PREPROCESS=false
WAIT_TIMEOUT=600
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFESTS_DIR="${SCRIPT_DIR}"

# ── Parse arguments ───────────────────────────────────────────────────────────
usage() {
  grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \{0,2\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--s3-bucket)        S3_BUCKET="$2";        shift 2 ;;
    -k|--s3-access-key)    S3_ACCESS_KEY="$2";    shift 2 ;;
    -s|--s3-secret-key)    S3_SECRET_KEY="$2";    shift 2 ;;
    -r|--aws-region)       AWS_REGION="$2";        shift 2 ;;
    -e|--s3-endpoint)      S3_ENDPOINT="$2";       shift 2 ;;
    -n|--namespace)        NAMESPACE="$2";          shift 2 ;;
    -c|--context)          KUBE_CONTEXT="$2";       shift 2 ;;
    -f|--force-preprocess) FORCE_PREPROCESS=true;  shift ;;
    -w|--wait-timeout)     WAIT_TIMEOUT="$2";       shift 2 ;;
    -h|--help)             usage ;;
    *) error "Unknown option: $1"; usage ;;
  esac
done

# ── Validate required args ────────────────────────────────────────────────────
MISSING=()
[[ -z "$S3_BUCKET" ]]     && MISSING+=("--s3-bucket")
[[ -z "$S3_ACCESS_KEY" ]] && MISSING+=("--s3-access-key")
[[ -z "$S3_SECRET_KEY" ]] && MISSING+=("--s3-secret-key")
if [[ ${#MISSING[@]} -gt 0 ]]; then
  error "Missing required arguments: ${MISSING[*]}"
  echo "Run with --help for usage."
  exit 1
fi

# ── kubectl wrapper ───────────────────────────────────────────────────────────
KUBECTL_ARGS=()
[[ -n "$KUBE_CONTEXT" ]] && KUBECTL_ARGS+=(--context "$KUBE_CONTEXT")

kctl() { kubectl "${KUBECTL_ARGS[@]}" "$@"; }

# ── Pre-flight checks ─────────────────────────────────────────────────────────
step "Pre-flight checks"

command -v kubectl >/dev/null 2>&1 || { error "kubectl not found in PATH"; exit 1; }
success "kubectl found: $(kubectl version --client --short 2>/dev/null | head -1)"

# Verify cluster connectivity
if ! kctl cluster-info >/dev/null 2>&1; then
  error "Cannot connect to Kubernetes cluster. Check your kubeconfig / context."
  exit 1
fi
success "Cluster reachable"

# Verify manifest files exist
for f in kubernetes-osrm.yaml; do
  if [[ ! -f "${MANIFESTS_DIR}/${f}" ]]; then
    error "Manifest not found: ${MANIFESTS_DIR}/${f}"
    exit 1
  fi
done
success "Manifests found in ${MANIFESTS_DIR}"

# ── Step 1: Create namespace ──────────────────────────────────────────────────
step "Creating namespace '${NAMESPACE}'"
if kctl get namespace "${NAMESPACE}" >/dev/null 2>&1; then
  info "Namespace '${NAMESPACE}' already exists"
else
  kctl create namespace "${NAMESPACE}"
  success "Namespace '${NAMESPACE}' created"
fi

# Label namespace for network policy selection
kctl label namespace "${NAMESPACE}" \
  app.kubernetes.io/managed-by=realestate-ng \
  geo-services=enabled \
  --overwrite >/dev/null
success "Namespace labelled"

# ── Step 2: Create S3 credentials secret ─────────────────────────────────────
step "Creating S3 credentials secret 'osrm-s3-secret'"
SECRET_NAME="osrm-s3-secret"

# Build secret data
SECRET_ARGS=(
  --from-literal=AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}"
  --from-literal=AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}"
  --from-literal=AWS_DEFAULT_REGION="${AWS_REGION}"
  --from-literal=S3_BUCKET="${S3_BUCKET}"
)
[[ -n "$S3_ENDPOINT" ]] && SECRET_ARGS+=(--from-literal=S3_ENDPOINT="${S3_ENDPOINT}")

if kctl -n "${NAMESPACE}" get secret "${SECRET_NAME}" >/dev/null 2>&1; then
  warn "Secret '${SECRET_NAME}' already exists — deleting and recreating"
  kctl -n "${NAMESPACE}" delete secret "${SECRET_NAME}"
fi

kctl -n "${NAMESPACE}" create secret generic "${SECRET_NAME}" "${SECRET_ARGS[@]}"
success "Secret '${SECRET_NAME}' created in namespace '${NAMESPACE}'"

# ── Step 3: Apply PVC ─────────────────────────────────────────────────────────
step "Applying PersistentVolumeClaim for OSRM data"

# Extract PVC from the main manifest and apply
kctl -n "${NAMESPACE}" apply -f - <<'PVCEOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: osrm-data-pvc
  labels:
    app: osrm
    component: routing
    managed-by: realestate-ng
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 20Gi
PVCEOF

success "PVC 'osrm-data-pvc' applied"

# Wait for PVC to be bound (up to 60s)
info "Waiting for PVC to be bound..."
PVC_WAIT=60
PVC_ELAPSED=0
while [[ $PVC_ELAPSED -lt $PVC_WAIT ]]; do
  PVC_STATUS=$(kctl -n "${NAMESPACE}" get pvc osrm-data-pvc -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending")
  if [[ "$PVC_STATUS" == "Bound" ]]; then
    success "PVC bound"
    break
  fi
  sleep 5
  PVC_ELAPSED=$((PVC_ELAPSED + 5))
done
if [[ "$PVC_STATUS" != "Bound" ]]; then
  warn "PVC not yet bound (status: ${PVC_STATUS}). Continuing — it may bind when the pod is scheduled."
fi

# ── Step 4: Data pre-processing Job ──────────────────────────────────────────
step "Checking OSRM pre-processed data"

# Check if pre-processed data already exists in S3
DATA_EXISTS=false
if command -v aws >/dev/null 2>&1 && [[ "$FORCE_PREPROCESS" == "false" ]]; then
  AWS_CMD_ARGS=()
  [[ -n "$S3_ENDPOINT" ]] && AWS_CMD_ARGS+=(--endpoint-url "$S3_ENDPOINT")
  if AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
     AWS_DEFAULT_REGION="${AWS_REGION}" \
     aws s3 ls "s3://${S3_BUCKET}/osrm/nigeria-latest.osrm.hsgr" \
     "${AWS_CMD_ARGS[@]}" >/dev/null 2>&1; then
    DATA_EXISTS=true
    info "Pre-processed OSRM data found in S3 — skipping pre-processing Job"
  fi
fi

if [[ "$DATA_EXISTS" == "false" ]] || [[ "$FORCE_PREPROCESS" == "true" ]]; then
  info "Launching OSRM data pre-processing Job (downloads Nigeria OSM data, ~200MB)"
  info "This may take 10-30 minutes depending on cluster resources."

  # Delete any previous pre-processing job
  kctl -n "${NAMESPACE}" delete job osrm-preprocess --ignore-not-found=true

  # Build S3 endpoint env var section
  S3_ENDPOINT_ENV=""
  if [[ -n "$S3_ENDPOINT" ]]; then
    S3_ENDPOINT_ENV="        - name: S3_ENDPOINT
          value: \"${S3_ENDPOINT}\""
  fi

  kctl -n "${NAMESPACE}" apply -f - <<JOBEOF
apiVersion: batch/v1
kind: Job
metadata:
  name: osrm-preprocess
  labels:
    app: osrm
    component: preprocessing
spec:
  ttlSecondsAfterFinished: 3600
  backoffLimit: 2
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
        - name: osrm-data
          persistentVolumeClaim:
            claimName: osrm-data-pvc
      initContainers:
        - name: download-osm
          image: curlimages/curl:8.5.0
          command:
            - sh
            - -c
            - |
              set -e
              echo "Downloading Nigeria OSM data..."
              curl -fSL \
                "https://download.geofabrik.de/africa/nigeria-latest.osm.pbf" \
                -o /data/nigeria-latest.osm.pbf
              echo "Download complete: \$(du -sh /data/nigeria-latest.osm.pbf)"
          volumeMounts:
            - name: osrm-data
              mountPath: /data
      containers:
        - name: osrm-preprocess
          image: ghcr.io/project-osrm/osrm-backend:v5.27.1
          command:
            - sh
            - -c
            - |
              set -e
              cd /data
              echo "=== OSRM Pre-processing: Nigeria ==="
              echo "Step 1/3: osrm-extract (car profile)..."
              osrm-extract -p /opt/car.lua nigeria-latest.osm.pbf
              echo "Step 2/3: osrm-partition..."
              osrm-partition nigeria-latest.osrm
              echo "Step 3/3: osrm-customize..."
              osrm-customize nigeria-latest.osrm
              echo "Pre-processing complete!"
              ls -lh /data/nigeria-latest.osrm*

              # Upload to S3 if AWS CLI available and credentials set
              if command -v aws >/dev/null 2>&1; then
                echo "Uploading pre-processed files to S3..."
                AWS_ARGS=""
                if [ -n "\${S3_ENDPOINT:-}" ]; then
                  AWS_ARGS="--endpoint-url \${S3_ENDPOINT}"
                fi
                aws s3 sync /data/ "s3://${S3_BUCKET}/osrm/" \
                  --exclude "*.osm.pbf" \$AWS_ARGS
                echo "Upload complete"
              else
                echo "AWS CLI not available — skipping S3 upload"
              fi
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: ${SECRET_NAME}
                  key: AWS_ACCESS_KEY_ID
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: ${SECRET_NAME}
                  key: AWS_SECRET_ACCESS_KEY
            - name: AWS_DEFAULT_REGION
              valueFrom:
                secretKeyRef:
                  name: ${SECRET_NAME}
                  key: AWS_DEFAULT_REGION
${S3_ENDPOINT_ENV}
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          volumeMounts:
            - name: osrm-data
              mountPath: /data
JOBEOF

  success "Pre-processing Job submitted"
  info "Waiting for pre-processing Job to complete (timeout: ${WAIT_TIMEOUT}s)..."
  if ! kctl -n "${NAMESPACE}" wait job/osrm-preprocess \
       --for=condition=complete \
       --timeout="${WAIT_TIMEOUT}s" 2>/dev/null; then
    # Check if it failed
    JOB_STATUS=$(kctl -n "${NAMESPACE}" get job osrm-preprocess \
      -o jsonpath='{.status.conditions[?(@.type=="Failed")].status}' 2>/dev/null || echo "")
    if [[ "$JOB_STATUS" == "True" ]]; then
      error "Pre-processing Job failed. Check logs:"
      error "  kubectl -n ${NAMESPACE} logs job/osrm-preprocess"
      exit 1
    fi
    warn "Pre-processing Job timed out — it may still be running."
    warn "Check status: kubectl -n ${NAMESPACE} get job osrm-preprocess"
  else
    success "Pre-processing Job completed successfully"
  fi
fi

# ── Step 5: Apply main OSRM manifests ─────────────────────────────────────────
step "Applying OSRM Kubernetes manifests"

# Patch the manifest with the correct namespace and S3 secret reference
kctl -n "${NAMESPACE}" apply -f "${MANIFESTS_DIR}/kubernetes-osrm.yaml"
success "OSRM manifests applied"

# ── Step 6: Wait for deployment to be ready ───────────────────────────────────
step "Waiting for OSRM deployment to be ready"

DEPLOY_TIMEOUT="${WAIT_TIMEOUT}s"
info "Waiting up to ${WAIT_TIMEOUT}s for osrm-backend rollout..."

if kctl -n "${NAMESPACE}" rollout status deployment/osrm-backend \
   --timeout="${DEPLOY_TIMEOUT}" 2>/dev/null; then
  success "OSRM deployment is ready"
else
  warn "Rollout timed out. Checking pod status..."
  kctl -n "${NAMESPACE}" get pods -l app=osrm
  warn "You can monitor with: kubectl -n ${NAMESPACE} rollout status deployment/osrm-backend"
fi

# ── Step 7: Health check ──────────────────────────────────────────────────────
step "Running OSRM health check"

# Get the service ClusterIP
OSRM_SVC_IP=$(kctl -n "${NAMESPACE}" get svc osrm-service \
  -o jsonpath='{.spec.clusterIP}' 2>/dev/null || echo "")
OSRM_SVC_PORT=$(kctl -n "${NAMESPACE}" get svc osrm-service \
  -o jsonpath='{.spec.ports[0].port}' 2>/dev/null || echo "5000")

if [[ -z "$OSRM_SVC_IP" ]]; then
  warn "Could not determine OSRM service ClusterIP — skipping in-cluster health check"
  info "To manually verify: kubectl -n ${NAMESPACE} port-forward svc/osrm-service 5000:5000"
  info "Then: curl 'http://localhost:5000/route/v1/driving/3.3792,6.5244;3.4219,6.4281?overview=false'"
else
  # Run health check from a temporary pod
  info "Running health check via temporary pod..."
  HEALTH_RESULT=$(kctl run osrm-healthcheck \
    --image=curlimages/curl:8.5.0 \
    --restart=Never \
    --rm \
    --attach \
    -n "${NAMESPACE}" \
    --timeout=60s \
    -- sh -c "
      # Lagos: Ikeja (3.3792,6.5244) → Victoria Island (3.4219,6.4281)
      curl -sf 'http://${OSRM_SVC_IP}:${OSRM_SVC_PORT}/route/v1/driving/3.3792,6.5244;3.4219,6.4281?overview=false&steps=false' \
        && echo 'HEALTH_OK' || echo 'HEALTH_FAIL'
    " 2>/dev/null || echo "HEALTH_SKIP")

  if echo "$HEALTH_RESULT" | grep -q "HEALTH_OK"; then
    success "OSRM health check passed (Lagos route: Ikeja → Victoria Island)"
  elif echo "$HEALTH_RESULT" | grep -q "HEALTH_SKIP"; then
    warn "Health check pod could not be created — service may not be accessible yet"
    info "Manual check: kubectl -n ${NAMESPACE} port-forward svc/osrm-service 5000:5000"
  else
    warn "OSRM health check returned unexpected result — service may still be starting"
    info "Retry: curl 'http://${OSRM_SVC_IP}:${OSRM_SVC_PORT}/route/v1/driving/3.3792,6.5244;3.4219,6.4281'"
  fi
fi

# ── Step 8: Print summary ─────────────────────────────────────────────────────
step "Deployment Summary"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         OSRM Kubernetes Deployment — Nigeria Real Estate     ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${CYAN}Namespace:${RESET}        ${NAMESPACE}"
echo -e "  ${CYAN}S3 Bucket:${RESET}        ${S3_BUCKET}"
echo -e "  ${CYAN}AWS Region:${RESET}       ${AWS_REGION}"
[[ -n "$S3_ENDPOINT" ]] && echo -e "  ${CYAN}S3 Endpoint:${RESET}      ${S3_ENDPOINT}"
[[ -n "$KUBE_CONTEXT" ]] && echo -e "  ${CYAN}K8s Context:${RESET}      ${KUBE_CONTEXT}"
echo ""

# Show pod status
echo -e "  ${CYAN}Pod Status:${RESET}"
kctl -n "${NAMESPACE}" get pods -l app=osrm --no-headers 2>/dev/null | \
  while read -r line; do echo "    $line"; done
echo ""

# Show service info
echo -e "  ${CYAN}Service:${RESET}"
kctl -n "${NAMESPACE}" get svc osrm-service --no-headers 2>/dev/null | \
  while read -r line; do echo "    $line"; done
echo ""

echo -e "  ${CYAN}OSRM API Endpoints (after port-forward):${RESET}"
echo "    kubectl -n ${NAMESPACE} port-forward svc/osrm-service 5000:5000"
echo ""
echo "    Route:      GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}"
echo "    Table:      GET /table/v1/driving/{coordinates}"
echo "    Nearest:    GET /nearest/v1/driving/{lng},{lat}"
echo "    Match:      GET /match/v1/driving/{coordinates}"
echo ""
echo -e "  ${CYAN}Nigerian City Coordinates:${RESET}"
echo "    Lagos (Ikeja):       3.3792, 6.5244"
echo "    Lagos (VI):          3.4219, 6.4281"
echo "    Abuja (CBD):         7.4951, 9.0579"
echo "    Port Harcourt (GRA): 7.0100, 4.8200"
echo "    Kano (Nassarawa):    8.5200, 12.0100"
echo ""
echo -e "  ${CYAN}Useful commands:${RESET}"
echo "    Logs:     kubectl -n ${NAMESPACE} logs -l app=osrm -f"
echo "    Scale:    kubectl -n ${NAMESPACE} scale deployment/osrm-backend --replicas=3"
echo "    Status:   kubectl -n ${NAMESPACE} get all -l app=osrm"
echo ""
echo -e "${GREEN}${BOLD}✅ OSRM deployment complete!${RESET}"
echo ""
