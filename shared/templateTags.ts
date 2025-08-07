// Predefined template tags for marketplace
export const TEMPLATE_TAGS = [
  // Trip Style
  { value: 'adventure', label: 'Adventure', category: 'style' },
  { value: 'relaxation', label: 'Relaxation', category: 'style' },
  { value: 'cultural', label: 'Cultural', category: 'style' },
  { value: 'romantic', label: 'Romantic', category: 'style' },
  { value: 'business', label: 'Business', category: 'style' },
  { value: 'luxury', label: 'Luxury', category: 'style' },
  { value: 'budget', label: 'Budget-Friendly', category: 'style' },
  { value: 'backpacking', label: 'Backpacking', category: 'style' },
  
  // Travel Group
  { value: 'solo', label: 'Solo Travel', category: 'group' },
  { value: 'couples', label: 'Couples', category: 'group' },
  { value: 'family', label: 'Family-Friendly', category: 'group' },
  { value: 'groups', label: 'Group Travel', category: 'group' },
  { value: 'honeymoon', label: 'Honeymoon', category: 'group' },
  
  // Interests
  { value: 'foodie', label: 'Foodie', category: 'interest' },
  { value: 'photography', label: 'Photography', category: 'interest' },
  { value: 'history', label: 'History', category: 'interest' },
  { value: 'art', label: 'Art & Museums', category: 'interest' },
  { value: 'nature', label: 'Nature', category: 'interest' },
  { value: 'beach', label: 'Beach', category: 'interest' },
  { value: 'mountains', label: 'Mountains', category: 'interest' },
  { value: 'nightlife', label: 'Nightlife', category: 'interest' },
  { value: 'shopping', label: 'Shopping', category: 'interest' },
  { value: 'wellness', label: 'Wellness & Spa', category: 'interest' },
  { value: 'sports', label: 'Sports & Activities', category: 'interest' },
  { value: 'wildlife', label: 'Wildlife', category: 'interest' },
  
  // Trip Type
  { value: 'weekend', label: 'Weekend Trip', category: 'duration' },
  { value: 'week-long', label: 'Week Long', category: 'duration' },
  { value: 'extended', label: 'Extended Stay', category: 'duration' },
  { value: 'city-break', label: 'City Break', category: 'type' },
  { value: 'road-trip', label: 'Road Trip', category: 'type' },
  { value: 'island-hopping', label: 'Island Hopping', category: 'type' },
  { value: 'multi-city', label: 'Multi-City', category: 'type' },
  
  // Special
  { value: 'off-beaten-path', label: 'Off the Beaten Path', category: 'special' },
  { value: 'hidden-gems', label: 'Hidden Gems', category: 'special' },
  { value: 'local-experience', label: 'Local Experience', category: 'special' },
  { value: 'sustainable', label: 'Eco-Friendly', category: 'special' },
  { value: 'accessible', label: 'Accessible Travel', category: 'special' },
  { value: 'pet-friendly', label: 'Pet-Friendly', category: 'special' },
] as const;

export type TemplateTag = typeof TEMPLATE_TAGS[number]['value'];

// Helper to get tags by category
export function getTagsByCategory(category: string) {
  return TEMPLATE_TAGS.filter(tag => tag.category === category);
}

// Helper to get tag label
export function getTagLabel(value: string) {
  return TEMPLATE_TAGS.find(tag => tag.value === value)?.label || value;
}