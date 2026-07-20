/**
 * gRPC Clients for Go Microservices
 * 
 * Provides TypeScript clients for Payment, Notification, and Image services
 * 
 * Setup:
 * 1. Install dependencies: pnpm add @grpc/grpc-js @grpc/proto-loader
 * 2. Generate TypeScript types: npm run generate:proto
 * 3. Start Go services
 * 4. Use clients from this module
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { logger } from "./logger";

// ============================================================================
// Configuration
// ============================================================================

const PROTO_PATH = path.join(__dirname, '../../proto');

const GRPC_SERVICES = {
  payment: {
    host: process.env.PAYMENT_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.PAYMENT_SERVICE_PORT || '50051'),
    protoFile: 'payment.proto',
  },
  notification: {
    host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '50052'),
    protoFile: 'notification.proto',
  },
  image: {
    host: process.env.IMAGE_SERVICE_HOST || 'localhost',
    port: parseInt(process.env.IMAGE_SERVICE_PORT || '50053'),
    protoFile: 'image.proto',
  },
};

// ============================================================================
// gRPC Client Base Class
// ============================================================================

class GrpcClient<T = any> {
  protected client: T | null = null;
  protected serviceName: string;
  protected isAvailable: boolean = false;

  constructor(
    protoPath: string,
    packageName: string,
    serviceName: string,
    serverAddress: string
  ) {
    this.serviceName = serviceName;

    try {
      // Load proto file
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
      const ServiceConstructor = protoDescriptor[packageName][serviceName];

      if (!ServiceConstructor) {
        logger.error(`[gRPC] Service ${serviceName} not found in proto`);
        return;
      }

      // Create client
      this.client = new ServiceConstructor(
        serverAddress,
        grpc.credentials.createInsecure()
      );

      logger.info(`[gRPC] ${serviceName} client created: ${serverAddress}`);
      this.isAvailable = true;
    } catch (error) {
      logger.error(`[gRPC] Failed to create ${serviceName} client:`, { error: String(error) });
      this.isAvailable = false;
    }
  }

  /**
   * Call gRPC method with promise wrapper
   */
  protected async call<TRequest, TResponse>(
    method: string,
    request: TRequest
  ): Promise<TResponse> {
    if (!this.client || !this.isAvailable) {
      throw new Error(`[gRPC] ${this.serviceName} client is not available`);
    }

    return new Promise((resolve, reject) => {
      const clientMethod = (this.client as any)[method];
      
      if (!clientMethod) {
        reject(new Error(`[gRPC] Method ${method} not found on ${this.serviceName}`));
        return;
      }

      clientMethod.call(this.client, request, (error: grpc.ServiceError | null, response: TResponse) => {
        if (error) {
          console.error(`[gRPC] ${this.serviceName}.${method} error:`, error.message);
          reject(error);
        } else {
          logger.info(`[gRPC] ${this.serviceName}.${method} success`);
          resolve(response);
        }
      });
    });
  }
}

// ============================================================================
// Payment Service Client
// ============================================================================

export interface PaymentRequest {
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  property_id?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResponse {
  success: boolean;
  transaction_id: string;
  payment_id: string;
  status: string;
  message: string;
  payment_url?: string;
}

export interface PaymentStatusRequest {
  payment_id: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export class PaymentGrpcClient extends GrpcClient {
  constructor() {
    const config = GRPC_SERVICES.payment;
    const protoPath = path.join(PROTO_PATH, config.protoFile);
    const serverAddress = `${config.host}:${config.port}`;
    
    super(protoPath, 'payment', 'PaymentService', serverAddress);
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    return this.call<PaymentRequest, PaymentResponse>('ProcessPayment', request);
  }

  async getPaymentStatus(request: PaymentStatusRequest): Promise<PaymentStatusResponse> {
    return this.call<PaymentStatusRequest, PaymentStatusResponse>('GetPaymentStatus', request);
  }

  async refundPayment(request: {
    payment_id: string;
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    refund_id: string;
    status: string;
    message: string;
  }> {
    return this.call('RefundPayment', request);
  }

  async listPayments(request: {
    user_id: string;
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{
    payments: Array<any>;
    total: number;
  }> {
    return this.call('ListPayments', request);
  }
}

// ============================================================================
// Notification Service Client (Placeholder)
// ============================================================================

export class NotificationGrpcClient {
  constructor() {
    // Note: notification.proto needs to be created
    logger.info('[gRPC] NotificationService client placeholder (proto file needed)');
  }

  async sendEmail(request: {
    to: string;
    subject: string;
    body: string;
    template?: string;
  }): Promise<{
    success: boolean;
    message_id: string;
  }> {
    logger.info('[gRPC] NotificationService.sendEmail (not implemented)');
    throw new Error('NotificationService not implemented - proto file needed');
  }
}

// ============================================================================
// Image Service Client (Placeholder)
// ============================================================================

export class ImageGrpcClient {
  constructor() {
    // Note: image.proto needs to be created
    logger.info('[gRPC] ImageService client placeholder (proto file needed)');
  }

  async optimizeImage(request: {
    image_url: string;
    width?: number;
    height?: number;
    quality?: number;
  }): Promise<{
    optimized_url: string;
    size_bytes: number;
  }> {
    logger.info('[gRPC] ImageService.optimizeImage (not implemented)');
    throw new Error('ImageService not implemented - proto file needed');
  }
}

// ============================================================================
// Service Client Factory
// ============================================================================

export class GrpcClients {
  private static instances: {
    payment?: PaymentGrpcClient;
    notification?: NotificationGrpcClient;
    image?: ImageGrpcClient;
  } = {};

  static getPaymentClient(): PaymentGrpcClient {
    if (!this.instances.payment) {
      this.instances.payment = new PaymentGrpcClient();
    }
    return this.instances.payment;
  }

  static getNotificationClient(): NotificationGrpcClient {
    if (!this.instances.notification) {
      this.instances.notification = new NotificationGrpcClient();
    }
    return this.instances.notification;
  }

  static getImageClient(): ImageGrpcClient {
    if (!this.instances.image) {
      this.instances.image = new ImageGrpcClient();
    }
    return this.instances.image;
  }
}

// Export singleton instances
export const paymentGrpcClient = GrpcClients.getPaymentClient();
export const notificationGrpcClient = GrpcClients.getNotificationClient();
export const imageGrpcClient = GrpcClients.getImageClient();
