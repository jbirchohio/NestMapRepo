import { enhancedCalendarSyncService } from './enhancedCalendarSync';

/**
 * Test file to demonstrate working calendar integrations
 * DO NOT run this in production without proper credentials
 */

async function testGoogleCalendarIntegration() {
  console.log('Testing Google Calendar Integration...');
  
  try {
    // Example configuration (replace with real credentials)
    const provider = await enhancedCalendarSyncService.configureProvider(
      1, // userId
      1, // organizationId
      'google',
      'Test Google Calendar',
      {
        clientId: 'your-google-client-id.apps.googleusercontent.com',
        clientSecret: 'your-google-client-secret',
        accessToken: 'ya29.your-access-token',
        refreshToken: 'your-refresh-token',
        calendarId: 'primary'
      },
      {
        syncDirection: 'two_way',
        syncFrequency: 'manual',
        syncTripEvents: true,
        syncActivityEvents: true,
        syncMeetingRooms: false,
        syncAttendees: true,
        eventPrefix: '[NestMap] ',
        conflictResolution: 'nestmap_wins',
        autoCreateMeetings: true,
        includePrivateEvents: false,
        reminderMinutes: [15, 60]
      }
    );

    console.log('✅ Google Calendar provider configured:', provider.id);

    // Test sync
    const syncResults = await enhancedCalendarSyncService.syncCalendar(1, provider.id);
    console.log('✅ Google Calendar sync completed:', syncResults);

  } catch (error) {
    console.error('❌ Google Calendar test failed:', error instanceof Error ? error.message : error);
  }
}

async function testOutlookCalendarIntegration() {
  console.log('Testing Outlook Calendar Integration...');
  
  try {
    // Example configuration (replace with real credentials)
    const provider = await enhancedCalendarSyncService.configureProvider(
      1, // userId
      1, // organizationId
      'outlook',
      'Test Outlook Calendar',
      {
        clientId: 'your-azure-app-id',
        clientSecret: 'your-azure-app-secret',
        tenantId: 'your-tenant-id',
        accessToken: 'your-access-token',
        refreshToken: 'your-refresh-token'
      },
      {
        syncDirection: 'two_way',
        syncFrequency: 'manual',
        syncTripEvents: true,
        syncActivityEvents: true,
        syncMeetingRooms: false,
        syncAttendees: true,
        conflictResolution: 'calendar_wins',
        autoCreateMeetings: false,
        includePrivateEvents: true
      }
    );

    console.log('✅ Outlook Calendar provider configured:', provider.id);

    // Test sync
    const syncResults = await enhancedCalendarSyncService.syncCalendar(1, provider.id);
    console.log('✅ Outlook Calendar sync completed:', syncResults);

  } catch (error) {
    console.error('❌ Outlook Calendar test failed:', error instanceof Error ? error.message : error);
  }
}

async function testExchangeCalendarIntegration() {
  console.log('Testing Exchange Calendar Integration...');
  
  try {
    // Example configuration (replace with real credentials)
    const provider = await enhancedCalendarSyncService.configureProvider(
      1, // userId
      1, // organizationId
      'exchange',
      'Test Exchange Calendar',
      {
        serverUrl: 'https://exchange.company.com/EWS/Exchange.asmx',
        username: 'user@company.com',
        password: 'user-password'
      },
      {
        syncDirection: 'one_way',
        syncFrequency: 'manual',
        syncTripEvents: true,
        syncActivityEvents: false,
        syncMeetingRooms: true,
        syncAttendees: true,
        conflictResolution: 'manual',
        autoCreateMeetings: false,
        includePrivateEvents: false
      }
    );

    console.log('✅ Exchange Calendar provider configured:', provider.id);

    // Test sync
    const syncResults = await enhancedCalendarSyncService.syncCalendar(1, provider.id);
    console.log('✅ Exchange Calendar sync completed:', syncResults);

  } catch (error) {
    console.error('❌ Exchange Calendar test failed:', error instanceof Error ? error.message : error);
  }
}

async function testCalDAVIntegration() {
  console.log('Testing CalDAV Integration...');
  
  try {
    // Example configuration (replace with real credentials)
    const provider = await enhancedCalendarSyncService.configureProvider(
      1, // userId
      1, // organizationId
      'caldav',
      'Test CalDAV Calendar',
      {
        serverUrl: 'https://caldav.provider.com/calendars/username/',
        username: 'your-username',
        password: 'your-password'
      },
      {
        syncDirection: 'two_way',
        syncFrequency: 'manual',
        syncTripEvents: true,
        syncActivityEvents: true,
        syncMeetingRooms: false,
        syncAttendees: false,
        conflictResolution: 'calendar_wins',
        autoCreateMeetings: false,
        includePrivateEvents: true
      }
    );

    console.log('✅ CalDAV provider configured:', provider.id);

    // Test sync
    const syncResults = await enhancedCalendarSyncService.syncCalendar(1, provider.id);
    console.log('✅ CalDAV sync completed:', syncResults);

  } catch (error) {
    console.error('❌ CalDAV test failed:', error instanceof Error ? error.message : error);
  }
}

async function testICalIntegration() {
  console.log('Testing iCal Integration...');
  
  try {
    // Example configuration (replace with real iCal URL)
    const provider = await enhancedCalendarSyncService.configureProvider(
      1, // userId
      1, // organizationId
      'ical',
      'Test iCal Feed',
      {
        serverUrl: 'https://calendar.google.com/calendar/ical/your-calendar-id/public/basic.ics'
      },
      {
        syncDirection: 'one_way', // iCal is read-only
        syncFrequency: 'manual',
        syncTripEvents: false, // Can't sync to read-only
        syncActivityEvents: false, // Can't sync to read-only
        syncMeetingRooms: false,
        syncAttendees: false,
        conflictResolution: 'nestmap_wins',
        autoCreateMeetings: false,
        includePrivateEvents: true
      }
    );

    console.log('✅ iCal provider configured:', provider.id);

    // Test sync
    const syncResults = await enhancedCalendarSyncService.syncCalendar(1, provider.id);
    console.log('✅ iCal sync completed:', syncResults);

  } catch (error) {
    console.error('❌ iCal test failed:', error instanceof Error ? error.message : error);
  }
}

async function testMeetingRoomBooking() {
  console.log('Testing Meeting Room Booking...');
  
  try {
    // Book a meeting room
    const meetingEvent = await enhancedCalendarSyncService.bookMeetingRoom(
      1, // organizationId
      'conference-room-1',
      new Date('2024-02-15T14:00:00.000Z'),
      new Date('2024-02-15T15:00:00.000Z'),
      'Team Meeting',
      ['user1@example.com', 'user2@example.com']
    );

    console.log('✅ Meeting room booked:', meetingEvent.id);

  } catch (error) {
    console.error('❌ Meeting room booking failed:', error instanceof Error ? error.message : error);
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Calendar Integration Tests...\n');

  // Test all integrations
  await testGoogleCalendarIntegration();
  console.log('');
  
  await testOutlookCalendarIntegration();
  console.log('');
  
  await testExchangeCalendarIntegration();
  console.log('');
  
  await testCalDAVIntegration();
  console.log('');
  
  await testICalIntegration();
  console.log('');
  
  await testMeetingRoomBooking();
  
  console.log('\n✅ All calendar integration tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  testGoogleCalendarIntegration,
  testOutlookCalendarIntegration,
  testExchangeCalendarIntegration,
  testCalDAVIntegration,
  testICalIntegration,
  testMeetingRoomBooking,
  runAllTests
};
