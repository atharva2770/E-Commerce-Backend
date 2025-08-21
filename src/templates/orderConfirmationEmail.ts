import { Order } from "@prisma/client";

interface OrderConfirmationEmailData {
  order: Order & {
    items: Array<{
      id: string;
      product: {
        name: string;
        images: Array<{ url: string; alt: string }>;
      };
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  trackingUrl?: string;
}

export const generateOrderConfirmationEmail = (
  data: OrderConfirmationEmailData
): string => {
  const { order, trackingUrl } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - ${order.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .order-summary {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .order-number {
            font-size: 18px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .order-date {
            color: #718096;
            font-size: 14px;
        }
        .items-section {
            margin-bottom: 30px;
        }
        .item {
            display: flex;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .item:last-child {
            border-bottom: none;
        }
        .item-image {
            width: 60px;
            height: 60px;
            border-radius: 8px;
            object-fit: cover;
            margin-right: 15px;
        }
        .item-details {
            flex: 1;
        }
        .item-name {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .item-meta {
            color: #718096;
            font-size: 14px;
        }
        .item-price {
            font-weight: 600;
            color: #2d3748;
        }
        .totals-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .total-row:last-child {
            margin-bottom: 0;
            border-top: 2px solid #e2e8f0;
            padding-top: 10px;
            font-weight: 600;
            font-size: 18px;
        }
        .shipping-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .shipping-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
        }
        .address {
            color: #4a5568;
            line-height: 1.5;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            background-color: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            opacity: 0.8;
        }
        .status-badge {
            display: inline-block;
            background-color: #48bb78;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .item {
                flex-direction: column;
                text-align: center;
            }
            .item-image {
                margin-right: 0;
                margin-bottom: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Confirmed!</h1>
            <p>Thank you for your purchase, ${order.user.firstName}!</p>
        </div>
        
        <div class="content">
            <div class="order-summary">
                <div class="order-number">Order #${order.orderNumber}</div>
                <div class="order-date">Placed on ${formatDate(
                  order.createdAt
                )}</div>
                <div style="margin-top: 15px;">
                    <span class="status-badge">${order.status.toLowerCase()}</span>
                </div>
            </div>

            <div class="items-section">
                <h2 style="margin-bottom: 20px; color: #2d3748;">Order Items</h2>
                ${order.items
                  .map(
                    (item) => `
                    <div class="item">
                        <img src="${
                          item.product.images[0]?.url ||
                          "https://via.placeholder.com/60x60?text=Product"
                        }" 
                             alt="${
                               item.product.images[0]?.alt || item.product.name
                             }" 
                             class="item-image">
                        <div class="item-details">
                            <div class="item-name">${item.product.name}</div>
                            <div class="item-meta">Quantity: ${
                              item.quantity
                            }</div>
                        </div>
                        <div class="item-price">${formatCurrency(
                          item.totalPrice
                        )}</div>
                    </div>
                `
                  )
                  .join("")}
            </div>

            <div class="totals-section">
                <h3 style="margin-bottom: 20px; color: #2d3748;">Order Summary</h3>
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${formatCurrency(Number(order.subtotal))}</span>
                </div>
                <div class="total-row">
                    <span>Shipping:</span>
                    <span>${formatCurrency(Number(order.shippingAmount))}</span>
                </div>
                <div class="total-row">
                    <span>Tax:</span>
                    <span>${formatCurrency(Number(order.taxAmount))}</span>
                </div>
                <div class="total-row">
                    <span>Total:</span>
                    <span>${formatCurrency(Number(order.totalAmount))}</span>
                </div>
            </div>

            <div class="shipping-info">
                <div class="shipping-title">Shipping Address</div>
                <div class="address">
                    ${JSON.parse(order.shippingAddress as string).address1}<br>
                    ${JSON.parse(order.shippingAddress as string).city}, ${
    JSON.parse(order.shippingAddress as string).state
  } ${JSON.parse(order.shippingAddress as string).postalCode}<br>
                    ${JSON.parse(order.shippingAddress as string).country}
                </div>
            </div>

            ${
              trackingUrl
                ? `
                <div style="text-align: center;">
                    <a href="${trackingUrl}" class="cta-button">Track Your Order</a>
                </div>
            `
                : ""
            }

            <div style="text-align: center; margin-top: 30px;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/orders/${order.id}" class="cta-button">View Order Details</a>
            </div>

            <div style="margin-top: 30px; padding: 20px; background-color: #f7fafc; border-radius: 8px;">
                <h3 style="margin-bottom: 15px; color: #2d3748;">What's Next?</h3>
                <ul style="color: #4a5568; line-height: 1.6; margin: 0; padding-left: 20px;">
                    <li>We'll send you updates as your order progresses</li>
                    <li>You'll receive a shipping confirmation with tracking information</li>
                    <li>Your order will be delivered within 3-5 business days</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for choosing our store!</p>
            <p>If you have any questions, please contact our support team</p>
            <p>Email: support@ecommerce.com | Phone: 1-800-123-4567</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.6;">
                This email was sent to ${order.user.email}
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

export const generateOrderStatusUpdateEmail = (
  order: Order,
  newStatus: string,
  user: { firstName: string; lastName: string; email: string }
): string => {
  const statusMessages = {
    CONFIRMED:
      "Your order has been confirmed and is being prepared for shipment.",
    PROCESSING: "Your order is being processed and will be shipped soon.",
    SHIPPED: "Your order has been shipped and is on its way to you!",
    DELIVERED: "Your order has been delivered. Thank you for your purchase!",
    CANCELLED: "Your order has been cancelled as requested.",
  };

  const statusMessage =
    statusMessages[newStatus as keyof typeof statusMessages] ||
    "Your order status has been updated.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Status Update - ${order.orderNumber}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .status-update {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        .status-badge {
            display: inline-block;
            background-color: #48bb78;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 15px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            background-color: #2d3748;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Order Status Update</h1>
        </div>
        
        <div class="content">
            <div class="status-update">
                <div class="status-badge">${newStatus.toLowerCase()}</div>
                <h2 style="margin-bottom: 15px; color: #2d3748;">Order #${
                  order.orderNumber
                }</h2>
                <p style="color: #4a5568; font-size: 16px;">${statusMessage}</p>
            </div>

            <div style="text-align: center;">
                <a href="${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/orders/${order.id}" class="cta-button">View Order Details</a>
            </div>

            ${
              order.trackingNumber
                ? `
                <div style="text-align: center; margin-top: 20px;">
                    <p style="color: #4a5568; margin-bottom: 10px;">Tracking Number: <strong>${order.trackingNumber}</strong></p>
                    <a href="https://tracking.example.com/${order.trackingNumber}" class="cta-button">Track Package</a>
                </div>
            `
                : ""
            }
        </div>

        <div class="footer">
            <p>Thank you for choosing our store!</p>
            <p>If you have any questions, please contact our support team</p>
            <p>Email: support@ecommerce.com | Phone: 1-800-123-4567</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.6;">
                This email was sent to ${user.email}
            </p>
        </div>
    </div>
</body>
</html>
  `;
};
