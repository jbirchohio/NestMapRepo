import type { Request, Response } from "express";
import { generateTripPdf } from "../pdfExport";
import { storage } from "../storage";

/**
 * PDF Export Controller - Fixed to return downloadable PDFs
 */

export async function generateTripProposal(req: Request, res: Response) {
  try {
    const tripId = Number(req.params.tripId);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // CRITICAL SECURITY FIX: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get trip data
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // CRITICAL: Verify user can access this trip's organization
    const userOrgId = req.user.organizationId || null;
    if (req.user.role !== 'super_admin' && trip.organizationId !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    // Get trip activities
    const activities = await storage.getActivitiesByTripId(tripId);

    // Generate PDF buffer - FIXED: Now returns actual PDF instead of HTML
    const pdfBuffer = await generateTripPdf(trip, activities);

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="trip-proposal-${trip.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating trip proposal PDF:", error);
    res.status(500).json({ 
      message: "Could not generate trip proposal", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

export async function generateItinerary(req: Request, res: Response) {
  try {
    const tripId = Number(req.params.tripId);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }

    // CRITICAL SECURITY FIX: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get trip data
    const trip = await storage.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // CRITICAL: Verify user can access this trip's organization
    const userOrgId = req.user.organizationId || null;
    if (req.user.role !== 'super_admin' && trip.organizationId !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot access this trip" });
    }

    // Get trip activities ordered by date and time
    const activities = await storage.getActivitiesByTripId(tripId);
    
    // Sort activities by date and time for proper itinerary order
    const sortedActivities = activities.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
      const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });

    // Generate itinerary PDF
    const pdfBuffer = await generateTripPdf(trip, sortedActivities);

    // Set proper headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="itinerary-${trip.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer directly
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating itinerary PDF:", error);
    res.status(500).json({ 
      message: "Could not generate itinerary", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}