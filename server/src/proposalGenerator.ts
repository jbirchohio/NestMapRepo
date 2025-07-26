import puppeteer from 'puppeteer';
// Use local schema instead of shared
// import { Trip, Activity } from '../shared/src/schema';
import type { Trip } from './db/schema';

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

// AI-powered cost estimation based on trip data
export function generateCostEstimate(trip: Trip, activities: Activity[]): {
    estimatedCost: number;
    costBreakdown: ProposalData['costBreakdown'];
} {
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
        const isLuxury = activities.some(a => a.tag === 'luxury' || a.notes?.toLowerCase().includes('luxury'));
        const isBudget = activities.some(a => a.tag === 'budget' || a.notes?.toLowerCase().includes('budget'));
        
        let rates = baseRates.domestic;
        if (isLuxury) rates = baseRates.luxury;
        else if (isBudget) rates = baseRates.budget;
        else if (isInternational) rates = baseRates.international;
        
        // Calculate detailed breakdown
        const flights = rates.flights;
        const hotels = rates.hotels * tripDuration;
        const activitiesCost = activities.length * 75; // Average activity cost
        const meals = tripDuration * 60; // 3 meals per day estimate
        const transportation = tripDuration * 40; // Local transport
        const miscellaneous = Math.round((flights + hotels + activitiesCost + meals + transportation) * 0.1); // 10% buffer
        
        const estimatedCost = flights + hotels + activitiesCost + meals + transportation + miscellaneous;
        
        return {
            estimatedCost,
            costBreakdown: {
                flights,
                hotels,
                activities: activitiesCost,
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

// Generate professional HTML for the proposal
function generateProposalHTML(data: ProposalData): string {
    const formatCurrency = (amount: number) => amount.toLocaleString('en-US');
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    const formatDateRange = (start: Date, end: Date) => {
        const startStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        return `${startStr} - ${endStr}`;
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Travel Proposal - ${data.clientName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .proposal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 3px solid #007bff; padding-bottom: 20px; }
        .company-name { font-size: 1.8rem; font-weight: bold; color: #007bff; }
        .proposal-title h1 { font-size: 2rem; color: #333; }
        .cost-summary { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; }
        .total-cost { font-size: 3rem; font-weight: bold; margin-bottom: 10px; }
        .cost-breakdown { background: white; border-radius: 8px; overflow: hidden; margin: 30px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .breakdown-header { background: #007bff; color: white; padding: 20px; font-size: 1.3rem; font-weight: bold; }
        .breakdown-item { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #f8f9fa; }
        .breakdown-amount { font-size: 1.1rem; font-weight: 600; color: #007bff; }
        .client-section { background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #007bff; }
        .contact-footer { margin-top: 50px; text-align: center; padding: 30px; background: #007bff; color: white; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="proposal-header">
        <div class="company-name">${data.companyName}</div>
        <div class="proposal-title">
            <h1>Travel Proposal</h1>
            <div>${data.trip.title}</div>
        </div>
    </div>
    
    <div class="client-section">
        <h3>Prepared For: ${data.clientName}</h3>
        <p><strong>Destination:</strong> ${data.trip.city}${data.trip.country ? ', ' + data.trip.country : ''}</p>
        <p><strong>Travel Dates:</strong> ${formatDateRange(new Date(data.trip.startDate), new Date(data.trip.endDate))}</p>
        <p><strong>Agent:</strong> ${data.agentName}</p>
        <p><strong>Valid Until:</strong> ${formatDate(data.validUntil)}</p>
    </div>
    
    <div class="cost-summary">
        <div class="total-cost">$${formatCurrency(data.estimatedCost)}</div>
        <div>Total Estimated Cost per Person</div>
    </div>
    
    <div class="cost-breakdown">
        <div class="breakdown-header">Cost Breakdown</div>
        <div class="breakdown-item">
            <div>✈️ Flights</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.flights)}</div>
        </div>
        <div class="breakdown-item">
            <div>🏨 Accommodation</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.hotels)}</div>
        </div>
        <div class="breakdown-item">
            <div>🎯 Activities & Tours</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.activities)}</div>
        </div>
        <div class="breakdown-item">
            <div>🍽️ Meals</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.meals)}</div>
        </div>
        <div class="breakdown-item">
            <div>🚗 Transportation</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.transportation)}</div>
        </div>
        <div class="breakdown-item">
            <div>📝 Miscellaneous</div>
            <div class="breakdown-amount">$${formatCurrency(data.costBreakdown.miscellaneous)}</div>
        </div>
        <div class="breakdown-item" style="background: #f8f9fa; font-weight: bold;">
            <div>Total Estimated Cost</div>
            <div class="breakdown-amount">$${formatCurrency(data.estimatedCost)}</div>
        </div>
    </div>
    
    ${data.proposalNotes ? `<div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 30px 0;"><h3>Important Notes</h3><p>${data.proposalNotes}</p></div>` : ''}
    
    <div class="contact-footer">
        <h3>Ready to Book Your Dream Trip?</h3>
        <p>Contact us today to confirm your reservation!</p>
        <div style="margin-top: 15px;">
            <div>📧 ${data.contactInfo.email}</div>
            ${data.contactInfo.phone ? `<div>📞 ${data.contactInfo.phone}</div>` : ''}
            ${data.contactInfo.website ? `<div>🌐 ${data.contactInfo.website}</div>` : ''}
        </div>
    </div>
</body>
</html>`;
}

// Generate AI-powered branded proposal PDF
export async function generateAIProposal(data: ProposalData): Promise<Buffer> {
    const html = generateProposalHTML(data);
    
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

