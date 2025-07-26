import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertTripSchema } from "../db/schema";
import { z } from "zod";
import { 
  validateAndSanitizeBody, 
  validateContentLength,
  contentCreationRateLimit,
  validationSchemas
} from "../middleware/inputValidation";
import {
  logOrganizationAccess,
  setOrganizationId
} from "../organizationContext";

export async function deleteTrip(req: Request, res: Response) {
  try {
    const tripId = Number(req.params.id);
    if (isNaN(tripId)) {
      return res.status(400).json({ message: "Invalid trip ID" });
    }
    
    // CRITICAL SECURITY FIX: Verify authentication
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // CRITICAL: Get existing trip to verify organization access
    const userOrgId = (req.user as any).organizationId || ''
    const existingTrip = await storage.getTrip(tripId.toString(), userOrgId);
    if (!existingTrip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // CRITICAL: Verify user can access this trip's organization
    if ((req.user as any).role !== 'super_admin' && existingTrip.organizationId !== userOrgId) {
      return res.status(403).json({ message: "Access denied: Cannot delete this trip" });
    }
    
    // Log organization access for audit
    logOrganizationAccess(req, 'delete', 'trip', tripId);
    
    const success = await storage.deleteTrip(tripId.toString(), userOrgId);
    if (!success) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    return res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return res.status(500).json({ 
      message: "Could not delete trip", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

