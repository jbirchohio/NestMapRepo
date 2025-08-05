// Make puppeteer optional - only load if available
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.log('ℹ️ Puppeteer not installed - PDF generation disabled');
}

import { Trip, Activity } from '@shared/schema';

/**
 * Enterprise-ready PDF generation utility
 * Generates actual PDF binary data instead of HTML
 */

interface PdfGenerationData {
  trip: Trip;
  activities: Activity[];
  todos?: any[];
  notes?: any[];
}

export async function generatePdfBuffer(data: PdfGenerationData): Promise<Buffer> {
  if (!puppeteer) {
    throw new Error('PDF generation is not available. Please install puppeteer: npm install puppeteer');
  }

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
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Generate professional HTML content for PDF
    const htmlContent = generatePdfHtml(data);
    
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF with proper configuration
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; color: #666;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function generatePdfHtml(data: PdfGenerationData): string {
  const { trip, activities } = data;
  
  // Group activities by day
  const activitiesByDay = groupActivitiesByDay(activities);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${trip.title} - Travel Itinerary</title>
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
            font-size: 12px;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 24px;
            color: #007bff;
            margin-bottom: 10px;
        }
        
        .trip-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .trip-info h2 {
            color: #007bff;
            font-size: 16px;
            margin-bottom: 10px;
        }
        
        .trip-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            font-size: 11px;
        }
        
        .day-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .day-header {
            background: #007bff;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .activity {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 12px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .activity-title {
            font-weight: bold;
            color: #007bff;
            font-size: 13px;
        }
        
        .activity-time {
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
        }
        
        .activity-location {
            color: #6c757d;
            font-size: 11px;
            margin-bottom: 5px;
        }
        
        .activity-notes {
            color: #495057;
            font-size: 10px;
            line-height: 1.4;
        }
        
        .activity-tag {
            background: #17a2b8;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            margin-top: 5px;
            display: inline-block;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .day-section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${trip.title}</h1>
            <p>Professional Travel Itinerary</p>
        </div>
        
        <div class="trip-info">
            <h2>Trip Overview</h2>
            <div class="trip-details">
                <div><strong>Destination:</strong> ${trip.city || 'Not specified'}, ${trip.country || ''}</div>
                <div><strong>Duration:</strong> ${trip.start_date} to ${trip.end_date}</div>
                <div><strong>Type:</strong> ${trip.trip_type || 'General'}</div>
                <div><strong>Status:</strong> ${trip.completed ? 'Completed' : 'Planned'}</div>
            </div>
        </div>
        
        ${activitiesByDay.map(day => `
            <div class="day-section">
                <div class="day-header">
                    ${day.dayName} - ${day.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                
                ${day.activities.map(activity => `
                    <div class="activity">
                        <div class="activity-header">
                            <div class="activity-title">${activity.title}</div>
                            ${activity.time ? `<div class="activity-time">${activity.time}</div>` : ''}
                        </div>
                        
                        ${activity.location_name ? `<div class="activity-location">📍 ${activity.location_name}</div>` : ''}
                        
                        ${activity.notes ? `<div class="activity-notes">${activity.notes}</div>` : ''}
                        
                        ${activity.tag ? `<div class="activity-tag">${activity.tag}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
        
        <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 10px;">
            Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
    </div>
</body>
</html>`;
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