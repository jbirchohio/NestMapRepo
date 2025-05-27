import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { Trip, Activity, Todo, Note } from '@shared/schema';

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

export interface PdfExportData {
    trip: Trip;
    activities: Activity[];
    todos: Todo[];
    notes: Note[];
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
        
        return pdf;
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