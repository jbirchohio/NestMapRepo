# Database Field Requirements Comparison

## Trips Table (User's Personal Trips)

### Required Fields (NOT NULL)
```sql
- id (auto-generated)
- title
- start_date
- end_date  
- user_id
```

### Optional Fields
```sql
- organization_id (always null for consumers)
- collaborators
- is_public (default: false)
- share_code
- sharing_enabled (default: false)
- share_permission (default: "read-only")
- city
- country
- location
- city_latitude
- city_longitude
- hotel
- hotel_latitude
- hotel_longitude
- completed (default: false)
- completed_at
- trip_type (default: "personal")
- client_name (unused)
- project_type (unused)
- budget
- created_at (auto)
- updated_at (auto)
```

## Activities Table (Trip Activities)

### Required Fields (NOT NULL)
```sql
- id (auto-generated)
- trip_id
- title
- date
```

### Functionally Required Fields (for core features)
```sql
- latitude (CRITICAL for map pins)
- longitude (CRITICAL for map pins)
- time (needed for scheduling/conflicts)
- location_name (for display)
```

### Optional Fields
```sql
- organization_id (always null)
- notes
- tag (restaurant/activity/transport/accommodation/other)
- assigned_to
- order
- travel_mode (walking/transit/driving)
- completed (default: false)
- booking_url
- booking_reference
- price
- currency (default: "USD")
- provider
- created_at (auto)
- updated_at (auto)
```

## Templates Table (Marketplace Templates)

### Required Fields (NOT NULL)
```sql
- id (auto-generated)
- user_id (creator)
- title
- slug (unique, auto-generated)
```

### Optional Fields with Defaults
```sql
- description
- price (default: "0")
- currency (default: "USD")
- cover_image
- destinations (default: [])
- duration (in days)
- trip_data (JSON containing full itinerary)
- tags (default: [])
- sales_count (default: 0)
- rating
- review_count (default: 0)
- status (default: "draft")
- featured (default: false)
- view_count (default: 0)
- quality_score (default: 0)
- moderation_status (default: "pending")
- moderation_notes
- auto_checks_passed (default: false)
- rejection_reason
- verified_at
- created_at (auto)
- updated_at (auto)
```

## CRITICAL: Coordinate Requirements

### Why Lat/Long Are Essential
Without latitude and longitude coordinates, the following features BREAK:

1. **Map Visualization** 
   - Activities won't appear on the map
   - No visual trip planning

2. **Distance Calculations**
   - Uses Haversine formula (server/services/conflictDetector.ts:194-199)
   - Falls back to "5km default" if missing coords
   - Inaccurate travel time warnings

3. **Travel Time Detection**
   - Can't warn about tight connections
   - Can't suggest realistic schedule adjustments
   - Example: "Tight connection between Museum and Restaurant"

4. **Route Optimization**
   - Can't calculate optimal activity order
   - No fuel/time savings calculations
   - Smart scheduling fails

### How Coordinates Are Obtained
```javascript
// Current flow in PlacesSearch.tsx:
1. User types location name
2. AI finds location details (name, address)
3. Mapbox Geocoding API converts address → lat/lng
4. Coordinates saved with activity
```

### Fallback Behavior
When coordinates are missing:
- Distance calculations default to 5km
- Activities marked with warning icon
- Map shows placeholder pin at city center
- Travel time warnings become generic

## Key Differences

### 1. **Creation Requirements**
- **Trip**: Only needs `title`, `start_date`, `end_date`, `user_id`
- **Activity**: Only needs `trip_id`, `title`, `date`
- **Template**: Only needs `user_id`, `title`, `slug`

### 2. **Data Structure**
- **Trips & Activities**: Normalized relational data (one trip → many activities)
- **Templates**: Denormalized with `trip_data` JSON containing entire itinerary

### 3. **Location Data**
- **Trip**: Has city-level location (city, country, coordinates)
- **Activity**: Has specific location per activity
- **Template**: Stores locations in `destinations` array and within `trip_data` JSON

### 4. **Dates**
- **Trip**: Has fixed `start_date` and `end_date`
- **Activity**: Has specific `date` (DATE type)
- **Template**: Has `duration` in days, no specific dates (buyers set their own)

### 5. **Monetization Fields**
- **Trip/Activity**: Can have `price` for tracking costs
- **Template**: Has `price` for selling, plus sales tracking fields

### 6. **Quality/Moderation**
- **Trip/Activity**: No quality checks
- **Template**: Has quality_score, moderation_status, auto_checks_passed

## Template Creation Process

When converting a Trip to a Template:

### What Gets Copied
```javascript
{
  // From Trip
  title: trip.title → template.title (can be modified)
  duration: calculated from (end_date - start_date)
  destinations: [trip.city, trip.country]
  
  // From Activities  
  trip_data: {
    activities: activities.map(a => ({
      title: a.title,
      date: relative day number (not absolute date),
      time: a.time,
      locationName: a.location_name,
      latitude: a.latitude,
      longitude: a.longitude,
      notes: a.notes,
      tag: a.tag,
      order: a.order,
      travelMode: a.travel_mode
      // Note: booking_url, price not copied (template buyers book their own)
    }))
  }
}
```

### What's New for Templates
- `description` (marketing copy)
- `price` (what buyers pay)
- `tags` (for discoverability)
- `cover_image` (visual appeal)
- `slug` (URL-friendly identifier)

### What's Not Included in Templates
- Specific dates (buyers choose their own)
- User-specific data (assigned_to, completed status)
- Booking references (each buyer books separately)
- Private notes or sensitive information

## Validation Rules

### Trip Creation
- Start date must be before or equal to end date
- Title cannot be empty

### Activity Creation  
- Date must fall within trip's date range
- Trip must exist and belong to user

### Template Publishing
- Must have description
- Must have at least one activity in trip_data
- Price must be between $4.99 and $299.99 (or $0 for free)
- Quality score must be >= 40 to publish
- Maximum 5 tags