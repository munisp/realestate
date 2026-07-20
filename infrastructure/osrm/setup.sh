#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# OSRM Nigeria Setup Script
# Run this ONCE on the host before starting the docker-compose stack.
# Requires: docker, ~5GB disk space, ~2GB RAM during processing
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

OSRM_VERSION="v5.27.1"
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:${OSRM_VERSION}"
DATA_DIR="$(pwd)/osrm-data"
OSM_URL="https://download.geofabrik.de/africa/nigeria-latest.osm.pbf"

echo "=== OSRM Nigeria Setup ==="
echo "Data directory: ${DATA_DIR}"
mkdir -p "${DATA_DIR}"

# ── Step 1: Download Nigeria OSM data ────────────────────────────────────────
if [ ! -f "${DATA_DIR}/nigeria-latest.osm.pbf" ]; then
    echo ""
    echo "Step 1/4: Downloading Nigeria OSM data (~100MB)..."
    wget -P "${DATA_DIR}" "${OSM_URL}" --progress=bar:force
else
    echo "Step 1/4: Nigeria OSM data already exists, skipping download"
fi

# ── Step 2: Extract (car profile) ────────────────────────────────────────────
if [ ! -f "${DATA_DIR}/nigeria-latest.osrm" ]; then
    echo ""
    echo "Step 2/4: Extracting OSM data with car profile (~5-10 min)..."
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-extract -p /opt/car.lua /data/nigeria-latest.osm.pbf
else
    echo "Step 2/4: Car extraction already done, skipping"
fi

# ── Step 3: Partition ─────────────────────────────────────────────────────────
if [ ! -f "${DATA_DIR}/nigeria-latest.osrm.partition" ]; then
    echo ""
    echo "Step 3/4: Partitioning (~2-3 min)..."
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-partition /data/nigeria-latest.osrm
else
    echo "Step 3/4: Partition already done, skipping"
fi

# ── Step 4: Customize ────────────────────────────────────────────────────────
if [ ! -f "${DATA_DIR}/nigeria-latest.osrm.cell_metrics" ]; then
    echo ""
    echo "Step 4/4: Customizing (~1 min)..."
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-customize /data/nigeria-latest.osrm
else
    echo "Step 4/4: Customization already done, skipping"
fi

# ── Also process foot profile ─────────────────────────────────────────────────
if [ ! -f "${DATA_DIR}/nigeria-foot.osrm" ]; then
    echo ""
    echo "Processing foot (walking) profile..."
    cp "${DATA_DIR}/nigeria-latest.osm.pbf" "${DATA_DIR}/nigeria-foot.osm.pbf"
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-extract -p /opt/foot.lua /data/nigeria-foot.osm.pbf
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-partition /data/nigeria-foot.osrm
    docker run -t --rm -v "${DATA_DIR}:/data" "${OSRM_IMAGE}" \
        osrm-customize /data/nigeria-foot.osrm
fi

echo ""
echo "✅ OSRM setup complete!"
echo ""
echo "Start the routing server with:"
echo "  docker-compose -f docker-compose.osrm.yml up -d"
echo ""
echo "Test car routing:"
echo "  curl 'http://localhost:5010/car/route/v1/driving/3.3792,6.5244;3.4219,6.4281?overview=full&geometries=geojson'"
echo ""
echo "Test walking:"
echo "  curl 'http://localhost:5010/walk/route/v1/foot/3.3792,6.5244;3.3900,6.5300?overview=full'"
