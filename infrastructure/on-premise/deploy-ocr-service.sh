#!/bin/bash
set -e

# Deploy OCR Service to Kubernetes
# Creates namespace, deployment, service, and HPA

echo "=========================================="
echo "Deploying OCR Service"
echo "=========================================="

# Step 1: Create namespace
echo "[1/5] Creating namespace..."
kubectl create namespace production || true

# Step 2: Create OCR service deployment
echo "[2/5] Creating OCR service deployment..."
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocr-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ocr-service
  template:
    metadata:
      labels:
        app: ocr-service
    spec:
      nodeSelector:
        nvidia.com/gpu.present: "true"
      containers:
      - name: ocr
        image: nvcr.io/nvidia/cuda:11.8.0-runtime-ubuntu22.04
        command: ["sleep", "infinity"]  # Replace with actual OCR service
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "8Gi"
            cpu: "2"
            nvidia.com/gpu: 1
          limits:
            memory: "16Gi"
            cpu: "4"
            nvidia.com/gpu: 1
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
EOF

# Step 3: Create service
echo "[3/5] Creating service..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ocr-service
  namespace: production
spec:
  selector:
    app: ocr-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8000
  type: ClusterIP
EOF

# Step 4: Create HPA
echo "[4/5] Creating HorizontalPodAutoscaler..."
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ocr-service-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ocr-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

# Step 5: Verify deployment
echo "[5/5] Verifying deployment..."
kubectl get pods -n production
kubectl get svc -n production

echo "=========================================="
echo "OCR Service deployed successfully!"
echo "=========================================="
echo ""
echo "Service status:"
kubectl get deployment ocr-service -n production
echo ""
echo "To test GPU access:"
echo "  kubectl exec -it <pod-name> -n production -- nvidia-smi"
echo "=========================================="

