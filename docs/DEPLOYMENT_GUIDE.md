# Real Estate Platform - Complete Deployment Guide

This guide covers deploying the entire real estate platform stack including web application, AI services, blockchain network, and video conferencing.

## Architecture Overview

The platform consists of four main components that work together to provide a comprehensive real estate solution with cutting-edge technology including artificial intelligence, blockchain transparency, and real-time video communication.

### Core Components

**Web Application** - React frontend with Node.js/Express backend providing property listings, search, analytics, and user management through a modern responsive interface.

**Ollama AI Service** - Python Flask microservice powered by Ollama (llama2/mistral models) delivering intelligent property recommendations, document analysis, and conversational assistance.

**Hyperledger Fabric Blockchain** - Distributed ledger network ensuring transparent property ownership records, immutable transaction history, and secure title transfers.

**Jitsi Meet Video Conferencing** - Self-hosted WebRTC platform enabling HD virtual property tours, agent consultations, and remote closing meetings.

## Prerequisites

Before deploying, ensure your system meets the following requirements:

**System Requirements** - Ubuntu 20.04+ or similar Linux distribution, minimum 16GB RAM (32GB recommended for full stack), 100GB available disk space, multi-core CPU (8+ cores recommended).

**Software Dependencies** - Docker 20.10+ and Docker Compose 1.29+, Node.js 22.x and pnpm package manager, Python 3.11+ for AI services, Go 1.20+ for blockchain chaincode, MySQL/TiDB database server.

**Network Requirements** - Open ports: 3000 (web), 5000 (AI API), 7050-7051 (blockchain), 8000 (Jitsi), 10000/UDP (Jitsi media), 11434 (Ollama). Static IP or dynamic DNS for production deployment.

**Optional Hardware** - NVIDIA GPU with CUDA support for faster AI inference (highly recommended for production), hardware audio devices for Jitsi recording functionality.

## Deployment Steps

### Step 1: Web Application Deployment

Navigate to the project directory and install dependencies using pnpm. Configure environment variables through the management UI or by setting DATABASE_URL, JWT_SECRET, and other required secrets. Push database schema changes with `pnpm db:push` and start the development server with `pnpm dev`. For production, build the application with `pnpm build` and deploy using the publish button in the management UI.

The web application will be accessible at the configured domain or localhost:3000 for development.

### Step 2: Ollama AI Service Deployment

Execute the automated deployment script at `scripts/deploy-ollama.sh` which will pull Docker images, start Ollama and chatbot services, and download AI models (llama2 and mistral). This process may take 10-30 minutes depending on your internet connection.

Verify the deployment by checking service health at http://localhost:11434/api/tags for Ollama and http://localhost:5000/health for the chatbot API. Configure the web application by setting OLLAMA_SERVICE_URL=http://localhost:5000 in your environment.

The AI service provides intelligent property analysis, personalized recommendations, and document explanations through natural language processing.

### Step 3: Hyperledger Fabric Blockchain Deployment

Run the Fabric network initialization script at `scripts/deploy-fabric.sh` which will download Hyperledger Fabric binaries, generate cryptographic materials, create the property channel, deploy the property registry chaincode, and initialize the ledger.

Verify blockchain functionality by querying all properties with the peer chaincode query command. Configure the web application by setting FABRIC_NETWORK_PATH=/opt/hyperledger/fabric-network and FABRIC_CHANNEL=propertychannel.

The blockchain network ensures transparent property ownership with immutable transaction records and automated smart contract execution for transfers.

### Step 4: Jitsi Meet Video Conferencing Deployment

Execute the Jitsi deployment script at `scripts/deploy-jitsi.sh` which will generate secure passwords, configure services (web, prosody, jicofo, jvb), optionally enable recording with Jibri, and start all containers.

Access Jitsi Meet at http://localhost:8000 and customize branding by adding your logo to docker/jitsi/branding/. Update the VideoConference component in the web application to use your Jitsi domain (localhost:8000 or your custom domain).

For production deployment, configure Let's Encrypt SSL by setting your domain, email, and enabling ENABLE_LETSENCRYPT=1 in the configuration.

## Configuration

### Environment Variables

The platform requires several environment variables configured through the management UI Settings panel or deployment scripts. Database configuration includes DATABASE_URL for MySQL/TiDB connection. Authentication settings include JWT_SECRET for session signing and OAuth credentials. Service URLs point to OLLAMA_SERVICE_URL, FABRIC_NETWORK_PATH, and Jitsi domain.

### Multi-Language Support

The platform supports seven languages with Nigerian and African language priority: English (default), Yoruba (Yorùbá), Igbo, Hausa, Swahili (Kiswahili), French (Français), and Arabic (العربية) with RTL support. Users can switch languages using the language switcher component in the header.

### CRM Integration

Connect with Salesforce or HubSpot by configuring API credentials in the CRM settings panel. The platform automatically syncs contacts, leads, deals, and activities bidirectionally.

## Production Deployment

For production environments, implement the following best practices:

**Security** - Enable HTTPS with SSL certificates, configure firewall rules restricting access, use strong passwords and rotate regularly, enable authentication for Jitsi Meet, implement rate limiting on APIs, regular security audits and updates.

**Performance** - Use load balancers for web application, deploy Ollama on GPU-enabled servers, scale Hyperledger Fabric with multiple peers, configure CDN for static assets, implement caching strategies, database replication and backups.

**Monitoring** - Set up application performance monitoring, configure log aggregation and analysis, implement health checks and alerts, monitor blockchain network status, track AI service usage and costs, video conferencing quality metrics.

**Backup and Recovery** - Regular database backups (daily recommended), blockchain ledger snapshots, configuration and secrets backup, disaster recovery plan and testing, automated backup verification.

## Troubleshooting

### Common Issues

**Ollama Service Not Responding** - Check if Docker container is running with `docker ps`, verify GPU drivers if using CUDA, check logs with `docker-compose logs ollama`, ensure sufficient memory available.

**Blockchain Network Errors** - Verify all peer nodes are running, check channel creation and chaincode deployment, review Fabric logs for errors, ensure correct network configuration, validate cryptographic materials.

**Jitsi Video Quality Issues** - Check network bandwidth and latency, verify UDP port 10000 is open, configure STUN/TURN servers properly, adjust video quality settings, monitor server resources.

**Database Connection Failures** - Verify DATABASE_URL is correct, check database server is running, ensure network connectivity, validate credentials and permissions, review connection pool settings.

## Maintenance

Regular maintenance tasks include updating Docker images monthly, rotating secrets and passwords quarterly, pruning old blockchain data as needed, cleaning up old recordings weekly, monitoring disk space usage, reviewing and optimizing database performance, updating AI models when new versions release, and testing backup restoration procedures.

## Support and Resources

For additional help and resources, consult the official documentation for Hyperledger Fabric, Ollama, and Jitsi Meet. Community forums and GitHub issues provide peer support. Professional support is available through the platform vendor.

## Next Steps

After successful deployment, customize branding and themes, configure payment processing with Stripe, set up email and SMS notifications, train AI models with your data, integrate with third-party services, conduct user acceptance testing, and plan for scaling and growth.

---

**Deployment Checklist**

- [ ] Web application running and accessible
- [ ] Database schema migrated successfully
- [ ] Ollama AI service responding to requests
- [ ] Blockchain network initialized and chaincode deployed
- [ ] Jitsi Meet video conferencing functional
- [ ] All environment variables configured
- [ ] SSL certificates installed (production)
- [ ] Backups configured and tested
- [ ] Monitoring and alerts set up
- [ ] Security hardening completed
- [ ] Load testing performed
- [ ] Documentation updated

Once all items are checked, your real estate platform is ready for production use.
