
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const replacements = {
  '@shared/types/activity': '@shared/schema',
  '@shared/types/activity/ActivityTypes.js': '@shared/schema',
  '@shared/types/api': '@shared/schema',
  '@shared/types/api.js': '@shared/schema',
  '@shared/types/auth': '@shared/schema',
  '@shared/types/auth/dto': '@shared/schema',
  '@shared/types/auth/jwt': '@shared/schema',
  '@shared/types/auth/permissions': '@shared/schema',
  '@shared/types/auth/UserRole': '@shared/schema',
  '@shared/types/auth/user/index': '@shared/schema',
  '@shared/types/booking/index.js': '@shared/schema',
  '@shared/types/CollaboratorPresence': '@shared/schema',
  '@shared/types/flight': '@shared/schema',
  '@shared/types/hotel': '@shared/schema',
  '@shared/types/notification': '@shared/schema',
  '@shared/types/SharedCollaboratorType': '@shared/schema',
  '@shared/types/trip': '@shared/schema',
  '@shared/types/trip/business-trip.types.js': '@shared/schema',
  '@shared/types/trip/trip.dto': '@shared/schema',
  '@shared/types/trip/SharedTripType': '@shared/schema',
  '@shared/types/user': '@shared/schema',
  '@shared/types/WebSocketMessageTypes': '@shared/schema',
  '@shared/types/index': '@shared/schema',
  '@shared/constants/ActivityActions.js': '@shared/schema',
  '@shared/constants/WebSocketMessageTypes.js': '@shared/schema',
  '@shared/api': '@shared/schema',
  '@shared/schema': '@shared/schema',
};

const main = async () => {
  const files = await glob('client/src/**/*.{ts,tsx}');
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let changed = false;

    for (const [oldPath, newPath] of Object.entries(replacements)) {
      // Only replace if it's part of an import statement
      const regex = new RegExp(`(import(?:.*?)from\s+['"])${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g');
      if (content.match(regex)) {
        content = content.replace(regex, `$1${newPath}$2`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf-8');
    }
  }
};

main();
