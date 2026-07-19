#!/bin/bash
set -e

echo "🚀 Deploying Shortlet Platform to Staging..."

# Deploy services in order
echo "📦 Deploying Booking Service..."
kubectl apply -f ../../services/booking-service/k8s/

echo "📦 Deploying Verification Service..."
kubectl apply -f ../../services/verification-service/k8s/

echo "📦 Deploying WhatsApp Messaging Service..."
kubectl apply -f ../../services/whatsapp-service/k8s/

echo "📦 Deploying Host Dashboard..."
kubectl apply -f ../../host-dashboard/k8s/deployment.yaml

echo "📦 Deploying Guest Booking App..."
kubectl apply -f ../../guest-booking-app/k8s/deployment.yaml

echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/booking-service
kubectl wait --for=condition=available --timeout=300s deployment/verification-service
kubectl wait --for=condition=available --timeout=300s deployment/whatsapp-service
kubectl wait --for=condition=available --timeout=300s deployment/host-dashboard
kubectl wait --for=condition=available --timeout=300s deployment/guest-booking-app

echo "✅ All services deployed successfully!"
echo ""
echo "Service URLs:"
echo "  Booking API: http://$(kubectl get svc booking-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3007"
echo "  Verification API: http://$(kubectl get svc verification-service -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):3008"
echo "  Host Dashboard: http://$(kubectl get svc host-dashboard -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
echo "  Guest App: http://$(kubectl get svc guest-booking-app -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
echo ""
echo "Run './smoke-test.sh' to verify deployment"
