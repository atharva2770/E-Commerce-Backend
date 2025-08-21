import { Request } from 'express';
import { User, UserRole } from '@prisma/client';

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// User types
export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  isActive?: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserProfileDto {
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  preferences?: Record<string, any>;
}

// Product types
export interface CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  weight?: number;
  dimensions?: Record<string, any>;
  isActive?: boolean;
  isFeatured?: boolean;
  isDigital?: boolean;
  downloadUrl?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  categoryId: string;
  brandId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  id: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  sortBy?: 'name' | 'price' | 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Category types
export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: string;
}

// Order types
export interface CreateOrderDto {
  userId: string;
  items: CreateOrderItemDto[];
  shippingAddress: AddressDto;
  billingAddress: AddressDto;
  notes?: string;
  paymentMethod?: string;
}

export interface CreateOrderItemDto {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface UpdateOrderDto {
  status?: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  trackingNumber?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  notes?: string;
}

// Address types
export interface AddressDto {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateAddressDto extends AddressDto {
  type: 'BILLING' | 'SHIPPING' | 'BOTH';
  isDefault?: boolean;
}

// Cart types
export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

// Review types
export interface CreateReviewDto {
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  title?: string;
  comment?: string;
}

// Payment types
export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PAYPAL' | 'STRIPE' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY';
  transactionId?: string;
  gatewayResponse?: Record<string, any>;
}

// File upload types
export interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  uploadPath: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search types
export interface SearchParams {
  q: string;
  filters?: Record<string, any>;
  pagination?: PaginationParams;
}

// Email types
export interface EmailTemplate {
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Notification types
export interface NotificationData {
  type: 'EMAIL' | 'SMS' | 'PUSH';
  recipient: string;
  subject?: string;
  message: string;
  data?: Record<string, any>;
}

// Cache types
export interface CacheConfig {
  ttl: number;
  prefix: string;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// JWT types
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

// Database types
export interface DatabaseConfig {
  url: string;
  pool: {
    min: number;
    max: number;
  };
}

// Redis types
export interface RedisConfig {
  url: string;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

// External API types
export interface ExternalApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
}

// Stripe types
export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

// PayPal types
export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
}

// Google OAuth types
export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Facebook OAuth types
export interface FacebookOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

// Environment types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  REDIS_URL: string;
  CORS_ORIGIN: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
