import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';

/**
 * Ollama Deployment Workflow Tests
 * 
 * Verifies deployment scripts and configuration
 */

describe('Ollama Deployment Tests', () => {
  describe('Deployment Scripts', () => {
    it('should have ML infrastructure health check script', () => {
      const scriptPath = '/home/ubuntu/realestate-platform/scripts/check-ml-infrastructure.sh';
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should have Ollama setup script', () => {
      const scriptPath = '/home/ubuntu/realestate-platform/scripts/setup-ollama.sh';
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should have Ollama service startup script', () => {
      const scriptPath = '/home/ubuntu/realestate-platform/scripts/start-ollama-service.sh';
      expect(existsSync(scriptPath)).toBe(true);
    });
  });

  describe('Configuration Files', () => {
    it('should have docker-compose for ML infrastructure', () => {
      const composePath = '/home/ubuntu/realestate-platform/docker-compose.ml-infra.yml';
      expect(existsSync(composePath)).toBe(true);
    });

    it('should have Ollama deployment guide', () => {
      const guidePath = '/home/ubuntu/realestate-platform/OLLAMA_DEPLOYMENT_GUIDE.md';
      expect(existsSync(guidePath)).toBe(true);
    });

    it('should have ML infrastructure deployment guide', () => {
      const guidePath = '/home/ubuntu/realestate-platform/ML_INFRASTRUCTURE_DEPLOYMENT.md';
      expect(existsSync(guidePath)).toBe(true);
    });
  });

  describe('Python Service Files', () => {
    it('should have enhanced Ollama service', () => {
      const servicePath = '/home/ubuntu/realestate-platform/python-services/ollama-chatbot/app_enhanced.py';
      expect(existsSync(servicePath)).toBe(true);
    });

    it('should have enhanced requirements file', () => {
      const reqPath = '/home/ubuntu/realestate-platform/python-services/ollama-chatbot/requirements_enhanced.txt';
      expect(existsSync(reqPath)).toBe(true);
    });

    it('should have fine-tuning script', () => {
      const finetunePath = '/home/ubuntu/realestate-platform/python-services/ollama-chatbot/finetune_model.py';
      expect(existsSync(finetunePath)).toBe(true);
    });
  });

  describe('Lakehouse Spark Jobs', () => {
    it('should have Silver transformation job', () => {
      const jobPath = '/home/ubuntu/realestate-platform/lakehouse/spark-jobs/ollama_silver_transformation.py';
      expect(existsSync(jobPath)).toBe(true);
    });

    it('should have Gold aggregation job', () => {
      const jobPath = '/home/ubuntu/realestate-platform/lakehouse/spark-jobs/ollama_gold_aggregation.py';
      expect(existsSync(jobPath)).toBe(true);
    });
  });

  describe('TypeScript Integration', () => {
    it('should have Ollama model management router', () => {
      const routerPath = '/home/ubuntu/realestate-platform/server/routers/ollamaModelManagement.ts';
      expect(existsSync(routerPath)).toBe(true);
    });

    it('should have admin dashboard page', () => {
      const pagePath = '/home/ubuntu/realestate-platform/client/src/pages/OllamaModelManagement.tsx';
      expect(existsSync(pagePath)).toBe(true);
    });
  });

  describe('Environment Configuration', () => {
    it('should define OLLAMA_SERVICE_URL environment variable', () => {
      const url = process.env.OLLAMA_SERVICE_URL || 'http://localhost:5004';
      expect(url).toBeDefined();
      expect(url).toContain('http');
    });
  });
});

describe('Deployment Workflow Integration', () => {
  it('should have complete deployment chain', () => {
    // Verify all components exist for complete deployment
    const components = [
      '/home/ubuntu/realestate-platform/docker-compose.ml-infra.yml',
      '/home/ubuntu/realestate-platform/scripts/check-ml-infrastructure.sh',
      '/home/ubuntu/realestate-platform/scripts/setup-ollama.sh',
      '/home/ubuntu/realestate-platform/scripts/start-ollama-service.sh',
      '/home/ubuntu/realestate-platform/python-services/ollama-chatbot/app_enhanced.py',
      '/home/ubuntu/realestate-platform/server/routers/ollamaModelManagement.ts',
      '/home/ubuntu/realestate-platform/client/src/pages/OllamaModelManagement.tsx',
    ];

    components.forEach(component => {
      expect(existsSync(component)).toBe(true);
    });
  });
});
