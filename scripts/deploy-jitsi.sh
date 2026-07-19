#!/bin/bash

# Jitsi Meet Deployment Script
# Deploys self-hosted Jitsi Meet video conferencing server

set -e

echo "🎥 Deploying Jitsi Meet Video Conferencing..."

# Configuration
JITSI_DIR="/home/ubuntu/realestate-platform/docker/jitsi"
CONFIG_DIR="$HOME/.jitsi-meet-cfg"
RECORDINGS_DIR="$HOME/jitsi-recordings"

# Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create directories
echo "📁 Creating configuration directories..."
mkdir -p "$CONFIG_DIR"/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
mkdir -p "$RECORDINGS_DIR"

# Generate strong random passwords
echo "🔐 Generating secure passwords..."
JICOFO_COMPONENT_SECRET=$(openssl rand -hex 16)
JICOFO_AUTH_PASSWORD=$(openssl rand -hex 16)
JVB_AUTH_PASSWORD=$(openssl rand -hex 16)
JIBRI_RECORDER_PASSWORD=$(openssl rand -hex 16)
JIBRI_XMPP_PASSWORD=$(openssl rand -hex 16)

# Create environment file
echo "📝 Creating environment configuration..."
cat > "$JITSI_DIR/.env" << EOF
# Jitsi Meet Configuration
TZ=UTC
CONFIG=$CONFIG_DIR
HTTP_PORT=8000
HTTPS_PORT=8443
PUBLIC_URL=https://meet.realestate.local
DOCKER_HOST_ADDRESS=$(hostname -I | awk '{print $1}')

# XMPP Configuration
XMPP_DOMAIN=meet.jitsi
XMPP_SERVER=xmpp.meet.jitsi
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_GUEST_DOMAIN=guest.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi
XMPP_INTERNAL_MUC_DOMAIN=internal-muc.meet.jitsi
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi

# Authentication
ENABLE_AUTH=0
ENABLE_GUESTS=1
AUTH_TYPE=internal

# Recording
ENABLE_RECORDING=1
JIBRI_RECORDING_DIR=$RECORDINGS_DIR

# Jibri Configuration
JIBRI_BREWERY_MUC=jibribrewery
JIBRI_PENDING_TIMEOUT=90
JIBRI_XMPP_USER=jibri
JIBRI_XMPP_PASSWORD=$JIBRI_XMPP_PASSWORD
JIBRI_RECORDER_USER=recorder
JIBRI_RECORDER_PASSWORD=$JIBRI_RECORDER_PASSWORD

# Component Secrets
JICOFO_COMPONENT_SECRET=$JICOFO_COMPONENT_SECRET
JICOFO_AUTH_USER=focus
JICOFO_AUTH_PASSWORD=$JICOFO_AUTH_PASSWORD
JVB_AUTH_USER=jvb
JVB_AUTH_PASSWORD=$JVB_AUTH_PASSWORD

# JVB Configuration
JVB_STUN_SERVERS=meet-jit-si-turnrelay.jitsi.net:443
JVB_PORT=10000
JVB_TCP_HARVESTER_DISABLED=true
JVB_TCP_PORT=4443
JVB_TCP_MAPPED_PORT=4443

# Features
ENABLE_LOBBY=1
DISABLE_HTTPS=1
ENABLE_HTTP_REDIRECT=0
ENABLE_TRANSCRIPTIONS=0
ENABLE_LETSENCRYPT=0
EOF

# Navigate to Jitsi directory
cd "$JITSI_DIR"

# Pull latest images
echo "📥 Pulling Jitsi Docker images..."
docker-compose pull

# Start services
echo "🚀 Starting Jitsi Meet services..."
docker-compose up -d web prosody jicofo jvb

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
if docker ps | grep -q jitsi-web; then
    echo "✅ Jitsi Web is running"
else
    echo "❌ Jitsi Web failed to start"
    exit 1
fi

# Optional: Start Jibri for recording
read -p "Do you want to enable recording (Jibri)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🎬 Starting Jibri recording service..."
    docker-compose up -d jibri
    echo "✅ Recording enabled"
fi

echo "
🎉 Jitsi Meet deployed successfully!

Access your Jitsi Meet instance at:
http://localhost:8000

Configuration:
- Config directory: $CONFIG_DIR
- Recordings directory: $RECORDINGS_DIR
- Guest access: Enabled
- Authentication: Disabled (can be enabled later)
- Recording: $([ -n \"$REPLY\" ] && echo \"Enabled\" || echo \"Disabled\")

To customize branding:
1. Add your logo to: $JITSI_DIR/branding/
2. Restart web service: docker-compose restart web

To enable HTTPS with Let's Encrypt:
1. Set your domain in .env (PUBLIC_URL, LETSENCRYPT_DOMAIN, LETSENCRYPT_EMAIL)
2. Set ENABLE_LETSENCRYPT=1
3. Restart services: docker-compose down && docker-compose up -d

To view logs:
docker-compose logs -f

To stop services:
docker-compose down

Integration with Real Estate Platform:
Update VideoConference component jitsiDomain to: localhost:8000
Or use your custom domain once configured.
"

# Save credentials
cat > "$CONFIG_DIR/credentials.txt" << EOF
Jitsi Meet Credentials
======================
Generated: $(date)

Component Secrets:
- JICOFO_COMPONENT_SECRET: $JICOFO_COMPONENT_SECRET
- JICOFO_AUTH_PASSWORD: $JICOFO_AUTH_PASSWORD
- JVB_AUTH_PASSWORD: $JVB_AUTH_PASSWORD
- JIBRI_RECORDER_PASSWORD: $JIBRI_RECORDER_PASSWORD
- JIBRI_XMPP_PASSWORD: $JIBRI_XMPP_PASSWORD

IMPORTANT: Keep these credentials secure!
EOF

echo "
🔐 Credentials saved to: $CONFIG_DIR/credentials.txt
"
