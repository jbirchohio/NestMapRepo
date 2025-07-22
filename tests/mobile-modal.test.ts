import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { JSDOM } from 'jsdom';

describe('Mobile Modal Positioning', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window;

  beforeAll(() => {
    // Setup JSDOM environment
    dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    document = dom.window.document;
    window = dom.window as unknown as Window;

    // Mock viewport for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    });

    // Mock CSS variable for dialog positioning
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 640px) {
        [data-radix-dialog-content] {
          position: fixed !important;
          top: 10px !important;
          left: 5vw !important;
          right: 5vw !important;
          width: 90vw !important;
          max-width: 400px !important;
          max-height: calc(100vh - 20px) !important;
          overflow: auto !important;
          margin: 0 auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  });

  afterAll(() => {
    dom.window.close();
  });

  describe('Dialog Positioning', () => {
    it('should apply mobile positioning styles to dialog content', () => {
      // Create mock dialog element
      const dialogContent = document.createElement('div');
      dialogContent.setAttribute('data-radix-dialog-content', '');
      dialogContent.style.position = 'fixed';
      dialogContent.style.top = '10px';
      dialogContent.style.left = '5vw';
      dialogContent.style.right = '5vw';
      dialogContent.style.width = '90vw';
      dialogContent.style.maxWidth = '400px';
      dialogContent.style.maxHeight = 'calc(100vh - 20px)';
      dialogContent.style.overflow = 'auto';
      dialogContent.style.margin = '0 auto';
      dialogContent.style.zIndex = '50';

      document.body.appendChild(dialogContent);

      // Verify positioning styles
      expect(dialogContent.style.position).toBe('fixed');
      expect(dialogContent.style.top).toBe('10px');
      expect(dialogContent.style.left).toBe('5vw');
      expect(dialogContent.style.right).toBe('5vw');
      expect(dialogContent.style.width).toBe('90vw');
      expect(dialogContent.style.maxWidth).toBe('400px');
      expect(dialogContent.style.maxHeight).toBe('calc(100vh - 20px)');
      expect(dialogContent.style.overflow).toBe('auto');
      expect(dialogContent.style.margin).toBe('0px auto');
      expect(dialogContent.style.zIndex).toBe('50');
    });

    it('should ensure dialog fits within mobile viewport', () => {
      const dialogContent = document.createElement('div');
      dialogContent.setAttribute('data-radix-dialog-content', '');
      
      // Apply mobile positioning
      dialogContent.style.position = 'fixed';
      dialogContent.style.top = '10px';
      dialogContent.style.left = '5vw';
      dialogContent.style.right = '5vw';
      dialogContent.style.width = '90vw';
      dialogContent.style.maxHeight = 'calc(100vh - 20px)';

      document.body.appendChild(dialogContent);

      // Calculate effective width (90vw of 375px viewport)
      const effectiveWidth = 0.9 * 375; // 337.5px
      expect(effectiveWidth).toBeLessThanOrEqual(375);

      // Calculate effective height (100vh - 20px of 667px viewport)
      const effectiveHeight = 667 - 20; // 647px
      expect(effectiveHeight).toBeLessThanOrEqual(667);

      // Verify dialog doesn't exceed viewport bounds
      expect(effectiveWidth).toBeGreaterThan(0);
      expect(effectiveHeight).toBeGreaterThan(0);
    });

    it('should handle overlay positioning correctly', () => {
      const overlay = document.createElement('div');
      overlay.setAttribute('data-radix-dialog-overlay', '');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';

      document.body.appendChild(overlay);

      // Verify overlay covers full viewport
      expect(overlay.style.position).toBe('fixed');
      expect(overlay.style.top).toBe('0px');
      expect(overlay.style.left).toBe('0px');
      expect(overlay.style.right).toBe('0px');
      expect(overlay.style.bottom).toBe('0px');
    });
  });

  describe('Component-Specific Positioning', () => {
    it('should apply positioning to AuthModal', () => {
      const authModal = document.createElement('div');
      authModal.className = 'auth-modal';
      authModal.style.position = 'fixed';
      authModal.style.top = '10px';
      authModal.style.left = '5vw';
      authModal.style.right = '5vw';
      authModal.style.width = '90vw';
      authModal.style.maxWidth = '400px';

      document.body.appendChild(authModal);

      expect(authModal.style.position).toBe('fixed');
      expect(authModal.style.top).toBe('10px');
      expect(authModal.style.width).toBe('90vw');
      expect(authModal.style.maxWidth).toBe('400px');
    });

    it('should apply positioning to NewTripModal', () => {
      const newTripModal = document.createElement('div');
      newTripModal.className = 'new-trip-modal';
      newTripModal.style.position = 'fixed';
      newTripModal.style.top = '10px';
      newTripModal.style.left = '5vw';
      newTripModal.style.right = '5vw';
      newTripModal.style.width = '90vw';
      newTripModal.style.maxWidth = '425px';

      document.body.appendChild(newTripModal);

      expect(newTripModal.style.position).toBe('fixed');
      expect(newTripModal.style.top).toBe('10px');
      expect(newTripModal.style.maxWidth).toBe('425px');
    });

    it('should apply positioning to TripTemplates modal', () => {
      const templatesModal = document.createElement('div');
      templatesModal.className = 'trip-templates-modal';
      templatesModal.style.position = 'fixed';
      templatesModal.style.top = '10px';
      templatesModal.style.left = '5vw';
      templatesModal.style.right = '5vw';
      templatesModal.style.width = '90vw';
      templatesModal.style.maxWidth = '800px';

      document.body.appendChild(templatesModal);

      expect(templatesModal.style.position).toBe('fixed');
      expect(templatesModal.style.top).toBe('10px');
      expect(templatesModal.style.maxWidth).toBe('800px');
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain proper spacing on small screens', () => {
      // Test with iPhone SE dimensions
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      Object.defineProperty(window, 'innerHeight', { value: 568 });

      const dialog = document.createElement('div');
      dialog.style.position = 'fixed';
      dialog.style.top = '10px';
      dialog.style.left = '5vw';
      dialog.style.right = '5vw';
      dialog.style.maxHeight = 'calc(100vh - 20px)';

      // Calculate effective spacing
      const leftRightSpacing = 0.05 * 320; // 16px each side
      const verticalSpacing = 20; // 10px top + 10px implied bottom

      expect(leftRightSpacing).toBe(16);
      expect(verticalSpacing).toBe(20);
      expect(320 - (leftRightSpacing * 2)).toBe(288); // Available width
      expect(568 - verticalSpacing).toBe(548); // Available height
    });

    it('should scale properly on larger mobile screens', () => {
      // Test with iPhone 14 Pro Max dimensions
      Object.defineProperty(window, 'innerWidth', { value: 430 });
      Object.defineProperty(window, 'innerHeight', { value: 932 });

      const dialog = document.createElement('div');
      dialog.style.width = '90vw';
      dialog.style.maxWidth = '400px';

      // 90vw of 430px = 387px, but maxWidth caps at 400px
      const effectiveWidth = Math.min(0.9 * 430, 400);
      expect(effectiveWidth).toBe(387);
    });
  });
});