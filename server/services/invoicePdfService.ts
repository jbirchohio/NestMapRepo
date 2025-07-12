import puppeteer from 'puppeteer.js';
import nodemailer from 'nodemailer.js';
import { Invoice } from '../db/invoiceSchema.js';
import { format } from 'date-fns.js';

interface InvoicePdfOptions {
  includeWatermark?: boolean;
  logoUrl?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export async function generateInvoicePdf(
  invoice: Invoice,
  options: InvoicePdfOptions = {}
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    const htmlContent = generateInvoiceHtml(invoice, options);
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

function generateInvoiceHtml(invoice: Invoice, options: InvoicePdfOptions = {}): string {
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const createdAt = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice #${invoice.id}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .company-info { text-align: right; }
          h1 { color: #2c3e50; margin-bottom: 5px; }
          .invoice-info { margin: 20px 0; }
          .client-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #f8f9fa; text-align: left; padding: 10px; border: 1px solid #dee2e6; }
          td { padding: 10px; border: 1px solid #dee2e6; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background-color: #f8f9fa; }
          .footer { margin-top: 50px; font-size: 0.9em; color: #6c757d; text-align: center; }
          ${options.includeWatermark ? '.watermark { opacity: 0.1; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 80px; color: #000; }' : ''}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h1>INVOICE</h1>
              <div class="invoice-info">
                <div><strong>Invoice #:</strong> ${invoice.id}</div>
                <div><strong>Date:</strong> ${format(createdAt, 'MMM dd, yyyy')}</div>
                ${dueDate ? `<div><strong>Due Date:</strong> ${format(dueDate, 'MMM dd, yyyy')}</div>` : ''}
              </div>
            </div>
            ${options.companyInfo ? `
              <div class="company-info">
                <div><strong>${options.companyInfo.name}</strong></div>
                <div>${options.companyInfo.address}</div>
                <div>Phone: ${options.companyInfo.phone}</div>
                <div>Email: ${options.companyInfo.email}</div>
              </div>
            ` : ''}
          </div>

          <div class="client-info">
            <h3>Bill To:</h3>
            <div><strong>${invoice.clientName}</strong></div>
            <div>${invoice.clientEmail}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description || 'Item'}</td>
                  <td>${item.quantity || 1}</td>
                  <td>${formatCurrency(item.unitPrice || 0, invoice.currency || 'USD')}</td>
                  <td>${formatCurrency(item.amount || 0, invoice.currency || 'USD')}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" class="text-right"><strong>Total</strong></td>
                <td><strong>${formatCurrency(invoice.amount || 0, invoice.currency || 'USD')}</strong></td>
              </tr>
            </tbody>
          </table>

          ${invoice.notes ? `
            <div class="notes">
              <h3>Notes</h3>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>${options.companyInfo?.name || 'NestMap'}</p>
          </div>
        </div>

        ${options.includeWatermark ? '<div class="watermark">SAMPLE</div>' : ''}
      </body>
    </html>
  `;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100); // Assuming amount is in cents
}

export async function sendInvoiceByEmail(
  invoice: Invoice,
  recipientEmail: string,
  options: InvoicePdfOptions & { subject?: string } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    // Generate the PDF
    const pdfBuffer = await generateInvoicePdf(invoice, options);
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: false,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: recipientEmail,
      subject: options.subject || `Invoice #${invoice.id}`,
      text: 'Please find your invoice attached.',
      attachments: [
        {
          filename: `invoice-${invoice.id}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    return {
      success: true,
      message: 'Invoice sent successfully',
    };
  } catch (error) {
    console.error('Error sending invoice by email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send invoice',
    };
  }
}
