import puppeteer from 'puppeteer.js';
import Handlebars from 'handlebars.js';
import { Buffer } from 'buffer.js';

// Define local types since we can't import from @shared/schema
type Activity = {
  id: string;
  title: string;
  description?: string;
  date: string | Date;
  time?: string;
  duration?: number;
  location?: string;
  cost?: number;
  notes?: string;
  status?: string;
  tag?: string;
};

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string | Date;
  priority?: 'low' | 'medium' | 'high.js';
};

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Trip = {
  id: string;
  title: string;
  description?: string;
  startDate: string | Date;
  endDate: string | Date;
  destination: string;
  country?: string;
  budget?: number;
  status?: 'draft' | 'planned' | 'in-progress' | 'completed' | 'cancelled.js';
  tags?: string[];
};

// Import invoice schema
type Invoice = {
  id: string;
  proposalId: string | null;
  organizationId: string;
  createdById: string | null;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'refunded' | null;
  amount: number;
  currency: string;
  taxAmount?: number;
  discountAmount?: number;
  dueDate?: string | Date;
  notes?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
};

// Professional proposal template with branding and cost estimates
const proposalTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Travel Proposal - {{clientName}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .proposal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
        }
        
        .company-branding {
            flex: 1;
        }
        
        .company-logo {
            max-height: 60px;
            margin-bottom: 10px;
        }
        
        .company-name {
            font-size: 1.8rem;
            font-weight: bold;
            color: #007bff;
        }
        
        .proposal-title {
            text-align: right;
            flex: 1;
        }
        
        .proposal-title h1 {
            font-size: 2rem;
            color: #333;
            margin-bottom: 5px;
        }
        
        .proposal-subtitle {
            color: #666;
            font-size: 1.1rem;
        }
        
        .client-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #007bff;
        }
        
        .client-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .info-group h3 {
            color: #495057;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .info-item {
            margin-bottom: 8px;
        }
        
        .cost-summary {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin: 30px 0;
            text-align: center;
        }
        
        .total-cost {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .cost-subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .cost-breakdown {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            margin: 30px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .breakdown-header {
            background: #007bff;
            color: white;
            padding: 20px;
            font-size: 1.3rem;
            font-weight: bold;
        }
        
        .breakdown-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .breakdown-item:last-child {
            border-bottom: none;
            background: #f8f9fa;
            font-weight: bold;
        }
        
        .breakdown-label {
            font-size: 1rem;
        }
        
        .breakdown-amount {
            font-size: 1.1rem;
            font-weight: 600;
            color: #007bff;
        }
        
        .itinerary-section {
            margin: 40px 0;
        }
        
        .section-title {
            color: #007bff;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 25px;
            font-size: 1.5rem;
        }
        
        .day-card {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        
        .day-header {
            background: #007bff;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .activity-item {
            padding: 20px;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .activity-title {
            font-weight: bold;
            font-size: 1.1rem;
            color: #495057;
        }
        
        .activity-time {
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        
        .activity-location {
            color: #6c757d;
            font-style: italic;
            margin-bottom: 8px;
        }
        
        .proposal-notes {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .proposal-notes h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .terms-section {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
        }
        
        .terms-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        
        .contact-footer {
            margin-top: 50px;
            text-align: center;
            padding: 30px;
            background: #007bff;
            color: white;
            border-radius: 8px;
        }
        
        .contact-info {
            margin-top: 15px;
        }
        
        .contact-item {
            margin: 5px 0;
        }
        
        @media print {
            body { padding: 20px; }
            .day-card { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="proposal-header">
        <div class="company-branding">
            {{#if companyLogo}}
            <img src="{{companyLogo}}" alt="{{companyName}}" class="company-logo">
            {{/if}}
            <div class="company-name">{{companyName}}</div>
        </div>
        <div class="proposal-title">
            <h1>Travel Proposal</h1>
            <div class="proposal-subtitle">{{trip.title}}</div>
        </div>
    </div>
    
    <div class="client-section">
        <div class="client-info">
            <div class="info-group">
                <h3>Prepared For</h3>
                <div class="info-item"><strong>Client:</strong> {{clientName}}</div>
                <div class="info-item"><strong>Destination:</strong> {{trip.city}}{{#if trip.country}}, {{trip.country}}{{/if}}</div>
                <div class="info-item"><strong>Travel Dates:</strong> {{formatDateRange trip.startDate trip.endDate}}</div>
            </div>
            <div class="info-group">
                <h3>Prepared By</h3>
                <div class="info-item"><strong>Agent:</strong> {{agentName}}</div>
                <div class="info-item"><strong>Email:</strong> {{contactInfo.email}}</div>
                {{#if contactInfo.phone}}
                <div class="info-item"><strong>Phone:</strong> {{contactInfo.phone}}</div>
                {{/if}}
                <div class="info-item"><strong>Valid Until:</strong> {{formatDate validUntil}}</div>
            </div>
        </div>
    </div>
    
    <div class="cost-summary">
        <div class="total-cost">$` + `{{formatCurrency estimatedCost}}` + `</div>
        <div class="cost-subtitle">Total Estimated Cost per Person</div>
    </div>
    
    <div class="cost-breakdown">
        <div class="breakdown-header">Cost Breakdown</div>
        <div class="breakdown-item">
            <div class="breakdown-label">✈️ Flights</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.flights}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label">🏨 Accommodation</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.hotels}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label">🎯 Activities & Tours</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.activities}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label">🍽️ Meals</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.meals}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label">🚗 Transportation</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.transportation}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label">📝 Miscellaneous</div>
            <div class="breakdown-amount">\${{formatCurrency costBreakdown.miscellaneous}}</div>
        </div>
        <div class="breakdown-item">
            <div class="breakdown-label"><strong>Total Estimated Cost</strong></div>
            <div class="breakdown-amount"><strong>\${{formatCurrency estimatedCost}}</strong></div>
        </div>
    </div>
    
    {{#if activitiesByDay}}
    <div class="itinerary-section">
        <h2 class="section-title">Detailed Itinerary</h2>
        {{#each activitiesByDay}}
        <div class="day-card">
            <div class="day-header">
                {{this.dayName}} - {{formatDate this.date}}
            </div>
            {{#each this.activities}}
            <div class="activity-item">
                <div class="activity-header">
                    <div class="activity-title">{{this.title}}</div>
                    {{#if this.time}}
                    <div class="activity-time">{{this.time}}</div>
                    {{/if}}
                </div>
                {{#if this.locationName}}
                <div class="activity-location">📍 {{this.locationName}}</div>
                {{/if}}
                {{#if this.notes}}
                <div class="activity-notes">{{this.notes}}</div>
                {{/if}}
            </div>
            {{/each}}
        </div>
        {{/each}}
    </div>
    {{/if}}
    
    {{#if proposalNotes}}
    <div class="proposal-notes">
        <h3>Important Notes</h3>
        <p>{{proposalNotes}}</p>
    </div>
    {{/if}}
    
    <div class="terms-section">
        <h3>Terms & Conditions</h3>
        <div class="terms-grid">
            <div>
                <strong>Pricing:</strong> All prices are estimates and subject to change based on availability and booking date.
            </div>
            <div>
                <strong>Validity:</strong> This proposal is valid until {{formatDate validUntil}}.
            </div>
            <div>
                <strong>Payment:</strong> 50% deposit required to confirm booking, balance due 30 days before travel.
            </div>
            <div>
                <strong>Cancellation:</strong> Cancellation policies vary by supplier and will be provided upon booking.
            </div>
        </div>
    </div>
    
    <div class="contact-footer">
        <h3>Ready to Book Your Dream Trip?</h3>
        <p>Contact us today to confirm your reservation and start planning your adventure!</p>
        <div class="contact-info">
            <div class="contact-item">📧 {{contactInfo.email}}</div>
            {{#if contactInfo.phone}}
            <div class="contact-item">📞 {{contactInfo.phone}}</div>
            {{/if}}
            {{#if contactInfo.website}}
            <div class="contact-item">🌐 {{contactInfo.website}}</div>
            {{/if}}
        </div>
    </div>
</body>
</html>
`;

// HTML template for the PDF export
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{trip.title}} - Travel Itinerary</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            color: #007bff;
            margin-bottom: 10px;
        }
        
        .trip-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .trip-info h2 {
            color: #495057;
            margin-bottom: 15px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            align-items: center;
        }
        
        .info-label {
            font-weight: bold;
            margin-right: 10px;
            color: #6c757d;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            color: #007bff;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }
        
        .day-section {
            margin-bottom: 30px;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .day-header {
            background: #007bff;
            color: white;
            padding: 15px 20px;
            font-weight: bold;
            font-size: 1.1rem;
        }
        
        .activity {
            padding: 20px;
            border-bottom: 1px solid #f8f9fa;
        }
        
        .activity:last-child {
            border-bottom: none;
        }
        
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .activity-title {
            font-weight: bold;
            font-size: 1.1rem;
            color: #495057;
        }
        
        .activity-time {
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
        }
        
        .activity-location {
            color: #6c757d;
            font-style: italic;
            margin-bottom: 8px;
        }
        
        .activity-notes {
            color: #495057;
            line-height: 1.5;
        }
        
        .activity-tag {
            display: inline-block;
            background: #ffc107;
            color: #212529;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            margin-top: 8px;
        }
        
        .todo-list {
            list-style: none;
        }
        
        .todo-item {
            padding: 10px 0;
            border-bottom: 1px solid #f8f9fa;
            display: flex;
            align-items: center;
        }
        
        .todo-checkbox {
            width: 16px;
            height: 16px;
            border: 2px solid #007bff;
            border-radius: 3px;
            margin-right: 12px;
            display: inline-block;
            position: relative;
        }
        
        .todo-completed .todo-checkbox::after {
            content: '✓.js';
            position: absolute;
            top: -2px;
            left: 1px;
            color: #007bff;
            font-weight: bold;
        }
        
        .todo-completed .todo-text {
            text-decoration: line-through;
            color: #6c757d;
        }
        
        .notes-content {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
            white-space: pre-wrap;
        }
        
        .footer {
            margin-top: 50px;
            text-align: center;
            color: #6c757d;
            font-size: 0.9rem;
            border-top: 1px solid #e9ecef;
            padding-top: 20px;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            .day-section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{trip.title}}</h1>
        <p>Travel Itinerary</p>
    </div>
    
    <div class="trip-info">
        <h2>Trip Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Dates:</span>
                <span>{{formatDateRange trip.startDate trip.endDate}}</span>
            </div>
            {{#if trip.city}}
            <div class="info-item">
                <span class="info-label">Destination:</span>
                <span>{{trip.city}}{{#if trip.country}}, {{trip.country}}{{/if}}</span>
            </div>
            {{/if}}
            {{#if trip.hotel}}
            <div class="info-item">
                <span class="info-label">Accommodation:</span>
                <span>{{trip.hotel}}</span>
            </div>
            {{/if}}
            <div class="info-item">
                <span class="info-label">Activities:</span>
                <span>{{activities.length}} planned</span>
            </div>
        </div>
    </div>
    
    {{#if activitiesByDay}}
    <div class="section">
        <h2>Daily Itinerary</h2>
        {{#each activitiesByDay}}
        <div class="day-section">
            <div class="day-header">
                {{this.dayName}} - {{formatDate this.date}}
            </div>
            {{#each this.activities}}
            <div class="activity">
                <div class="activity-header">
                    <div class="activity-title">{{this.title}}</div>
                    <div class="activity-time">{{this.time}}</div>
                </div>
                {{#if this.locationName}}
                <div class="activity-location">📍 {{this.locationName}}</div>
                {{/if}}
                {{#if this.notes}}
                <div class="activity-notes">{{this.notes}}</div>
                {{/if}}
                {{#if this.tag}}
                <div class="activity-tag">{{this.tag}}</div>
                {{/if}}
            </div>
            {{/each}}
        </div>
        {{/each}}
    </div>
    {{/if}}
    
    {{#if todos.length}}
    <div class="section">
        <h2>To-Do List</h2>
        <ul class="todo-list">
            {{#each todos}}
            <li class="todo-item {{#if this.completed}}todo-completed{{/if}}">
                <span class="todo-checkbox"></span>
                <span class="todo-text">{{this.task}}</span>
            </li>
            {{/each}}
        </ul>
    </div>
    {{/if}}
    
    {{#if notes.length}}
    <div class="section">
        <h2>Trip Notes</h2>
        {{#each notes}}
        <div class="notes-content">{{this.content}}</div>
        {{/each}}
    </div>
    {{/if}}
    
    <div class="footer">
        <p>Generated by NestMap • {{currentDate}}</p>
    </div>
</body>
</html>
`;

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', function(date: Date | string) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
});

Handlebars.registerHelper('formatDateRange', function(startDate: Date | string, endDate: Date | string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startStr = start.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    const endStr = end.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    return `${startStr} - ${endStr}`;
});

Handlebars.registerHelper('formatCurrency', function(amount: number) {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
});

export interface PdfExportData {
    trip: Trip;
    activities: Activity[];
    todos: Todo[];
    notes: Note[];
}

export interface ProposalData {
    trip: Trip;
    activities: Activity[];
    clientName: string;
    agentName: string;
    companyName: string;
    companyLogo?: string;
    estimatedCost: number;
    costBreakdown: {
        flights: number;
        hotels: number;
        activities: number;
        meals: number;
        transportation: number;
        miscellaneous: number;
    };
    proposalNotes?: string;
    validUntil: Date;
    contactInfo: {
        email: string;
        phone?: string;
        website?: string;
    };
}

export async function generateTripPdf(data: PdfExportData): Promise<Buffer> {
    const template = Handlebars.compile(htmlTemplate);
    
    // Group activities by day
    const activitiesByDay = groupActivitiesByDay(data.activities);
    
    const html = template({
        trip: data.trip,
        activities: data.activities,
        activitiesByDay,
        todos: data.todos,
        notes: data.notes,
        currentDate: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })
    });
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}

function groupActivitiesByDay(activities: Activity[]) {
    const grouped = activities.reduce((acc, activity) => {
        const date = new Date(activity.date);
        const dateKey = date.toDateString();
        
        if (!acc[dateKey]) {
            acc[dateKey] = {
                date: date,
                dayName: getDayName(date),
                activities: []
            };
        }
        
        acc[dateKey].activities.push(activity);
        return acc;
    }, {} as Record<string, { date: Date; dayName: string; activities: Activity[] }>);
    
    // Sort activities within each day by time
    Object.values(grouped).forEach((day: { date: Date; dayName: string; activities: Activity[] }) => {
        day.activities.sort((a: Activity, b: Activity) => {
            const timeA = a.time || '00:00.js';
            const timeB = b.time || '00:00.js';
            return timeA.localeCompare(timeB);
        });
    });
    
    // Return sorted days
    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getDayName(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// AI-powered proposal generation with intelligent cost estimates
export async function generateAIProposal(data: ProposalData): Promise<Buffer> {
    const template = Handlebars.compile(proposalTemplate);
    
    // Group activities by day
    const activitiesByDay = groupActivitiesByDay(data.activities);
    
    // Calculate trip duration
    const startDate = new Date(data.trip.startDate);
    const endDate = new Date(data.trip.endDate);
    const tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate HTML with template data
    const html = template({
        ...data,
        activitiesByDay,
        currentDate: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        }),
        tripDuration
    });
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.setContent(html, { 
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            }
        });
        
        return Buffer.from(pdf);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Add the missing InvoicePdfData interface
interface InvoicePdfData {
  invoice: Invoice;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
  };
  includeWatermark?: boolean;
}

// Add the invoice PDF generation function
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
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
    
    // Compile the invoice template
    const template = Handlebars.compile(invoiceTemplate);
    const html = template({
      ...data,
      includeWatermark: data.includeWatermark !== false,
    });

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    const pdf = await page.pdf({
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
    return Buffer.from(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Add the invoice template
const invoiceTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice #{{invoice.id}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #007bff;
        }
        
        .company-info {
            text-align: right;
        }
        
        .company-logo {
            max-height: 60px;
            margin-bottom: 10px;
        }
        
        .invoice-title {
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .invoice-info {
            margin: 20px 0;
        }
        
        .client-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        
        th {
            background-color: #f1f5f9;
            font-weight: 600;
        }
        
        .text-right {
            text-align: right;
        }
        
        .total-row {
            font-weight: bold;
            background-color: #f8f9fa;
        }
        
        .footer {
            margin-top: 50px;
            font-size: 0.9em;
            color: #6c757d;
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
        
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.1);
            pointer-events: none;
            z-index: 1000;
        }
    </style>
</head>
<body>
    {{#if includeWatermark}}
    <div class="watermark">SAMPLE</div>
    {{/if}}
    
    <div class="header">
        <div>
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-info">
                <div><strong>Invoice #:</strong> {{invoice.id}}</div>
                <div><strong>Date:</strong> {{formatDate invoice.createdAt}}</div>
                {{#if invoice.dueDate}}
                <div><strong>Due Date:</strong> {{formatDate invoice.dueDate}}</div>
                {{/if}}
                {{#if invoice.status}}
                <div><strong>Status:</strong> <span style="text-transform: capitalize;">{{invoice.status}}</span></div>
                {{/if}}
            </div>
        </div>
        {{#if companyInfo}}
        <div class="company-info">
            {{#if companyInfo.logoUrl}}
            <img src="{{companyInfo.logoUrl}}" alt="{{companyInfo.name}}" class="company-logo">
            {{/if}}
            <div><strong>{{companyInfo.name}}</strong></div>
            <div>{{companyInfo.address}}</div>
            <div>Phone: {{companyInfo.phone}}</div>
            <div>Email: {{companyInfo.email}}</div>
        </div>
        {{/if}}
    </div>

    <div class="client-info">
        <h3>Bill To:</h3>
        <div><strong>{{invoice.clientName}}</strong></div>
        <div>{{invoice.clientEmail}}</div>
        {{#if invoice.clientAddress}}
        <div>{{invoice.clientAddress}}</div>
        {{/if}}
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            {{#each invoice.items}}
            <tr>
                <td>{{this.description}}</td>
                <td>{{this.quantity}}</td>
                <td>{{formatCurrency this.unitPrice ../invoice.currency}}</td>
                <td>{{formatCurrency this.amount ../invoice.currency}}</td>
            </tr>
            {{/each}}
            <tr class="total-row">
                <td colspan="3" class="text-right"><strong>Subtotal</strong></td>
                <td>{{formatCurrency invoice.amount invoice.currency}}</td>
            </tr>
            {{#if invoice.taxAmount}}
            <tr>
                <td colspan="3" class="text-right"><strong>Tax</strong></td>
                <td>{{formatCurrency invoice.taxAmount invoice.currency}}</td>
            </tr>
            {{/if}}
            {{#if invoice.discountAmount}}
            <tr>
                <td colspan="3" class="text-right"><strong>Discount</strong></td>
                <td>-{{formatCurrency invoice.discountAmount invoice.currency}}</td>
            </tr>
            {{/if}}
            <tr class="total-row">
                <td colspan="3" class="text-right"><strong>Total</strong></td>
                <td><strong>{{formatCurrency (add invoice.amount (or invoice.taxAmount 0) (or (negate invoice.discountAmount) 0)) invoice.currency}}</strong></td>
            </tr>
        </tbody>
    </table>

    {{#if invoice.notes}}
    <div class="notes" style="margin-top: 30px;">
        <h3>Notes</h3>
        <p>{{invoice.notes}}</p>
    </div>
    {{/if}}

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>{{#if companyInfo}}{{companyInfo.name}}{{else}}NestMap{{/if}}</p>
    </div>
</body>
</html>
`;

// Helper functions for Handlebars templates
Handlebars.registerHelper('add', function(this: any, ...args: any[]) {
  // The last argument is the Handlebars options object
  const numbers = args.slice(0, -1) as number[];
  return numbers.reduce((sum, num) => sum + (Number(num) || 0), 0);
});

Handlebars.registerHelper('negate', function(this: any, value: any) {
  const num = Number(value);
  return isNaN(num) ? 0 : -num;
});

Handlebars.registerHelper('or', function(this: any, a: any, b: any) {
  return a || b;
});

// Register the formatDate helper
Handlebars.registerHelper('formatDate', function(this: any, date: string | Date | undefined) {
  if (!date) return '.js';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

// Register the formatCurrency helper
Handlebars.registerHelper('formatCurrency', function(this: any, amount: any, currency = 'USD') {
  const numAmount = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount / 100); // Convert from cents to dollars
});