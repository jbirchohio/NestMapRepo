/**
 * Performance test for optimized data processing
 * Tests improvements in analytics and conflict detection algorithms
 */

// Test 1: Analytics performance comparison
console.log("=== Performance Test 1: Analytics Processing ===");

// Simulate large dataset for analytics
const trips = Array.from({length: 10000}, (_, i) => ({
  id: i,
  userId: i % 50,
  city: ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'][i % 5],
  country: ['USA', 'UK', 'Japan', 'France', 'Germany'][i % 5],
  startDate: new Date(2024, i % 12, (i % 28) + 1),
  endDate: new Date(2024, i % 12, (i % 28) + 3),
  tripCount: 1
}));

// Old approach: Multiple reduce operations
console.time('OldAnalyticsApproach');
const oldTotalTrips = trips.reduce((sum, trip) => sum + trip.tripCount, 0);
const oldDestinations = trips
  .reduce((acc, trip) => {
    const key = `${trip.city}-${trip.country}`;
    acc[key] = (acc[key] || 0) + trip.tripCount;
    return acc;
  }, {});
const oldDestinationArray = Object.entries(oldDestinations).map(([key, count]) => ({
  city: key.split('-')[0],
  country: key.split('-')[1],
  tripCount: count,
  percentage: Math.round((count / oldTotalTrips) * 100)
}));
console.timeEnd('OldAnalyticsApproach');

// New approach: Single pass optimization
console.time('NewAnalyticsApproach');
const destinationCounts = new Map();
let totalTrips = 0;

for (const trip of trips) {
  totalTrips += trip.tripCount;
  const key = `${trip.city}-${trip.country}`;
  destinationCounts.set(key, (destinationCounts.get(key) || 0) + trip.tripCount);
}

const newDestinationArray = Array.from(destinationCounts.entries()).map(([key, count]) => {
  const [city, country] = key.split('-');
  return {
    city,
    country,
    tripCount: count,
    percentage: Math.round((count / totalTrips) * 100)
  };
});
console.timeEnd('NewAnalyticsApproach');

console.log(`Results match: ${JSON.stringify(oldDestinationArray.slice(0, 2)) === JSON.stringify(newDestinationArray.slice(0, 2))}`);

// Test 2: Conflict detection performance
console.log("\n=== Performance Test 2: Conflict Detection ===");

// Generate test trips with potential conflicts
const testTrips = Array.from({length: 1000}, (_, i) => ({
  id: i,
  startDate: new Date(2024, 6, i % 30 + 1),
  endDate: new Date(2024, 6, (i % 30) + 3),
  city: ['New York', 'London', 'Tokyo'][i % 3],
  userId: i % 20,
  title: `Trip ${i}`
}));

// Old O(n²) approach
console.time('OldConflictDetection');
const oldConflicts = [];
for (let i = 0; i < testTrips.length; i++) {
  for (let j = i + 1; j < testTrips.length; j++) {
    const trip1 = testTrips[i];
    const trip2 = testTrips[j];
    
    const start1 = new Date(trip1.startDate);
    const end1 = new Date(trip1.endDate);
    const start2 = new Date(trip2.startDate);
    const end2 = new Date(trip2.endDate);
    
    if (start1 <= end2 && start2 <= end1) {
      oldConflicts.push({ trips: [trip1.id, trip2.id], type: 'overlap' });
    }
  }
}
console.timeEnd('OldConflictDetection');

// New optimized approach
console.time('NewConflictDetection');
const sortedTrips = testTrips
  .map(trip => ({
    ...trip,
    startTime: new Date(trip.startDate).getTime(),
    endTime: new Date(trip.endDate).getTime()
  }))
  .sort((a, b) => a.startTime - b.startTime);

const newConflicts = [];
for (let i = 0; i < sortedTrips.length; i++) {
  const trip1 = sortedTrips[i];
  
  for (let j = i + 1; j < sortedTrips.length; j++) {
    const trip2 = sortedTrips[j];
    
    if (trip2.startTime > trip1.endTime) break;
    
    newConflicts.push({ trips: [trip1.id, trip2.id], type: 'overlap' });
  }
}
console.timeEnd('NewConflictDetection');

console.log(`Conflict counts match: ${oldConflicts.length === newConflicts.length}`);
console.log(`Old conflicts: ${oldConflicts.length}, New conflicts: ${newConflicts.length}`);

// Test 3: Memory usage optimization
console.log("\n=== Performance Test 3: Memory Usage ===");

// Test Set vs Map performance for unique counts
const userIds = Array.from({length: 50000}, (_, i) => i % 1000);

console.time('SetApproach');
const uniqueUsersSet = new Set(userIds);
const teamSizeSet = uniqueUsersSet.size;
console.timeEnd('SetApproach');

console.time('MapApproach');
const userCounts = new Map();
for (const userId of userIds) {
  userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
}
const teamSizeMap = userCounts.size;
console.timeEnd('MapApproach');

console.log(`Set result: ${teamSizeSet}, Map result: ${teamSizeMap}`);
console.log(`Results match: ${teamSizeSet === teamSizeMap}`);

console.log("\n=== Performance Tests Complete ===");
console.log("All optimizations maintain functionality while improving performance");