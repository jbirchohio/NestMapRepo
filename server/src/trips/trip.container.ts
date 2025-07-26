import { TripServiceImpl } from './services/trip.service';
import { TripRepositoryImpl } from './repositories/trip.repository';

// Initialize repository
const tripRepository = new TripRepositoryImpl();

// Initialize service with its dependencies
export const tripService = new TripServiceImpl(tripRepository);

