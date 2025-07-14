import { 
  Controller, 
  Get, 
  Param, 
  Req, 
  Res
} from '@nestjs/common';
import { Request, Response } from 'express';

// Types and interfaces
import { Booking } from '../../../../shared/types/bookings';
import { AuthUser } from '../../types/auth-user';

// Services and utilities
import { BookingService } from '../services/booking.service';
import { ResponseFormatter } from '../utils/response-formatter.util';

@Controller('bookings')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService
  ) {}

  @Get(':id')
  async getBookingById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const booking = await this.bookingService.getBookingById(id);
      return ResponseFormatter.success(res, { booking });
    } catch (error) {
      console.error(`Error getting booking ${id}`, error);
      throw error;
    }
  }
}