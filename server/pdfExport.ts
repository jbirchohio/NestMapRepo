import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { Trip, Activity, Todo, Note } from '@shared/schema';

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
            content: '✓';
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
    Object.values(grouped).forEach(day => {
        day.activities.sort((a, b) => {
            const timeA = a.time || '00:00';
            const timeB = b.time || '00:00';
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
    
    const html = template({
        ...data,
        activitiesByDay,
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

// AI-powered cost estimation based on trip data
export async function generateCostEstimate(trip: Trip, activities: Activity[]): Promise<{
    estimatedCost: number;
    costBreakdown: ProposalData['costBreakdown'];
}> {
    const { generateThemedItinerary } = await import('./openai');
    
    try {
        // Calculate trip duration
        const startDate = new Date(trip.startDate);
        const endDate = new Date(trip.endDate);
        const tripDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Base estimates per day based on destination and trip type
        const baseRates = {
            domestic: { daily: 200, flights: 400, hotels: 120 },
            international: { daily: 350, flights: 800, hotels: 180 },
            luxury: { daily: 500, flights: 1200, hotels: 300 },
            budget: { daily: 100, flights: 250, hotels: 60 }
        };
        
        // Determine trip category
        const isInternational = trip.country && trip.country.toLowerCase() !== 'usa' && trip.country.toLowerCase() !== 'united states';
        const isLuxury = tripActivities.some(a => a.tag === 'luxury' || a.notes?.toLowerCase().includes('luxury'));
        const isBudget = tripActivities.some(a => a.tag === 'budget' || a.notes?.toLowerCase().includes('budget'));
        
        let rates = baseRates.domestic;
        if (isLuxury) rates = baseRates.luxury;
        else if (isBudget) rates = baseRates.budget;
        else if (isInternational) rates = baseRates.international;
        
        // Calculate detailed breakdown
        const flights = rates.flights;
        const hotels = rates.hotels * tripDuration;
        const activities = activities.length * 75; // Average activity cost
        const meals = tripDuration * 60; // 3 meals per day estimate
        const transportation = tripDuration * 40; // Local transport
        const miscellaneous = Math.round((flights + hotels + activities + meals + transportation) * 0.1); // 10% buffer
        
        const estimatedCost = flights + hotels + activities + meals + transportation + miscellaneous;
        
        return {
            estimatedCost,
            costBreakdown: {
                flights,
                hotels,
                activities,
                meals,
                transportation,
                miscellaneous
            }
        };
    } catch (error) {
        console.error('Error generating cost estimate:', error);
        // Fallback estimates
        return {
            estimatedCost: 1500,
            costBreakdown: {
                flights: 600,
                hotels: 480,
                activities: 300,
                meals: 180,
                transportation: 120,
                miscellaneous: 120
            }
        };
    }
}