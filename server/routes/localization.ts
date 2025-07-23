import express from 'express';
import { LocalizationService as ImportedLocalizationService } from '../localizationService';
import { authenticateJWT as requireAuth, requireRole } from '../src/middleware/auth';
import { auditLogger } from '../auditLogger';

const router = express.Router();
const localizationService = new ImportedLocalizationService();

// Get supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await localizationService.getSupportedLanguages();
    res.json(languages);
  } catch (error) {
    console.error('Error fetching supported languages:', error);
    res.status(500).json({ error: 'Failed to fetch supported languages' });
  }
});

// Get supported currencies
router.get('/currencies', async (req, res) => {
  try {
    const currencies = await localizationService.getSupportedCurrencies();
    res.json(currencies);
  } catch (error) {
    console.error('Error fetching supported currencies:', error);
    res.status(500).json({ error: 'Failed to fetch supported currencies' });
  }
});

// Get translations for a language
router.get('/translations/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const { namespace } = req.query;

    const translations = await localizationService.getTranslations(
      [language],
      namespace as string
    );

    res.json(translations);
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

// Get specific translation
router.get('/translate/:language/:key', async (req, res) => {
  try {
    const { language, key } = req.params;
    const { variables } = req.query;

    const translation = await localizationService.getTranslation(
      key,
      language,
      variables ? JSON.parse(variables as string) : undefined
    );

    res.json({ key, translation });
  } catch (error) {
    console.error('Error fetching translation:', error);
    res.status(500).json({ error: 'Failed to fetch translation' });
  }
});

// Convert currency
router.post('/currency/convert', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ 
        error: 'Amount, from currency, and to currency are required' 
      });
    }

    const result = await localizationService.convertCurrency(
      amount,
      fromCurrency,
      toCurrency
    );

    res.json(result);
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// Get currency exchange rates
router.get('/currency/rates', async (req, res) => {
  try {
    const { baseCurrency, targetCurrencies } = req.query;

    const rates = await localizationService.getExchangeRates(
      baseCurrency as string,
      targetCurrencies ? (targetCurrencies as string).split(',') : undefined
    );

    res.json(rates);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Format number for locale
router.post('/format/number', async (req, res) => {
  try {
    const { number, locale, options } = req.body;

    if (number === undefined || number === null) {
      return res.status(400).json({ error: 'Number is required' });
    }

    const formatted = await localizationService.formatNumber(
      number,
      locale || 'en-US'
    );

    res.json({ number, locale, formatted });
  } catch (error) {
    console.error('Error formatting number:', error);
    res.status(500).json({ error: 'Failed to format number' });
  }
});

// Format date for locale
router.post('/format/date', async (req, res) => {
  try {
    const { date, locale, options } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const formatted = await localizationService.formatDate(
      new Date(date),
      locale || 'en-US',
      options
    );

    res.json({ date, locale, formatted });
  } catch (error) {
    console.error('Error formatting date:', error);
    res.status(500).json({ error: 'Failed to format date' });
  }
});

// Get organization localization settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized: Organization ID is missing' });
    }

    const settings = await localizationService.getOrganizationSettings(organizationId);

    res.json(settings);
  } catch (error) {
    console.error('Error fetching localization settings:', error);
    res.status(500).json({ error: 'Failed to fetch localization settings' });
  }
});

// Update organization localization settings
router.patch('/settings', requireAuth, requireRole(['admin', 'organization_manager']), async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      throw new Error('User or Organization ID is missing');
    }
    const settings = req.body;

    const updatedSettings = await localizationService.updateOrganizationSettings(
      organizationId,
      settings
    );

    await auditLogger.log({
      action: 'localization_settings_updated',
      userId: req.user?.userId || 'unknown',
      organizationId: organizationId,
      logType: 'localization_settings',
      details: { settings }
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating localization settings:', error);
    res.status(500).json({ error: 'Failed to update localization settings' });
  }
});

// Add custom translation
router.post('/translations', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    if (!req.user || !req.user.organizationId) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing or Organization ID is missing' });
    }
    const organizationId = req.user.organizationId;
    const { key, translations, namespace } = req.body;

    if (!key || !translations) {
      return res.status(400).json({ error: 'Key and translations are required' });
    }

    const result = await localizationService.addCustomTranslation(
      organizationId,
      key,
      translations,
      namespace
    );

    await auditLogger.log({
      action: 'custom_translation_added',
      userId: req.user.userId,
      organizationId,
      details: { key, namespace, languages: Object.keys(translations) },
      logType: ''
    });

    res.json(result);
  } catch (error) {
    console.error('Error adding custom translation:', error);
    res.status(500).json({ error: 'Failed to add custom translation' });
  }
});

// Update custom translation
router.patch('/translations/:key', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized: Organization ID is missing' });
    }
    const { key } = req.params;
    const { translations, namespace } = req.body;

    const result = await localizationService.updateCustomTranslation(
      organizationId,
      key,
      translations,
      namespace
    );

    await auditLogger.log({
      action: 'custom_translation_updated',
      userId: req.user.userId,
      organizationId,
      logType: 'translation',
      details: { key, namespace, languages: Object.keys(translations) }
    });

    res.json(result);
  } catch (error) {
    console.error('Error updating custom translation:', error);
    res.status(500).json({ error: 'Failed to update custom translation' });
  }
});

// Delete custom translation
router.delete('/translations/:key', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized: Organization ID is missing' });
    }
    const { key } = req.params;
    const { namespace } = req.query;

    await localizationService.deleteCustomTranslation(
      organizationId,
      key,
      namespace as string
    );

    await auditLogger.log({
      action: 'custom_translation_deleted',
      userId: req.user.userId,
      organizationId,
      logType: 'translation',
      details: { key, namespace }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom translation:', error);
    res.status(500).json({ error: 'Failed to delete custom translation' });
  }
});

// Get localization statistics
router.get('/stats', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    const organizationId = req.user.organizationId;

    const stats = await localizationService.getLocalizationStats(organizationId);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching localization statistics:', error);
    res.status(500).json({ error: 'Failed to fetch localization statistics' });
  }
});

// Import translations
router.post('/import', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized: Organization ID is missing' });
    }

    const { language, translations, namespace, overwrite } = req.body;

    if (typeof language !== 'string' || !language || typeof translations !== 'object' || translations === null) {
      return res.status(400).json({ error: 'Language must be a string and translations must be a non-null object' });
    }

    const result = await localizationService.importTranslations(
      organizationId,
      language,
      translations,
      namespace,
      overwrite
    );

    await auditLogger.log({
      action: 'translations_imported',
      userId: req.user?.userId || 'unknown',
      organizationId,
      details: {
        language,
        namespace,
        importedCount: result && typeof result.importedCount !== 'undefined' ? result.importedCount : null,
        overwrite
      },
      logType: ''
    });

    res.json(result);
  } catch (error) {
    console.error('Error importing translations:', error);
    res.status(500).json({ error: 'Failed to import translations' });
  }
});

// Export translations
router.get('/export/:language', requireAuth, requireRole(['admin', 'translator']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User information is missing' });
    }
    const organizationId = req.user.organizationId;
    const { language } = req.params;
    const { namespace, format } = req.query;

    const exportData = await localizationService.exportTranslations(
      organizationId,
      language,
      namespace as string,
      format as string
    );

    await auditLogger.log({
      action: 'translations_exported',
      userId: req.user?.userId || 'unknown',
      organizationId: organizationId || 'unknown',
      details: { language, namespace, format },
      logType: ''
    });

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting translations:', error);
    res.status(500).json({ error: 'Failed to export translations' });
  }
});
/**
 * Service class for handling localization-related operations such as translations, currency rates, and organization configs.
 */
class LocalizationService {
  private static instance: LocalizationService;

  /**
   * Stores translations for different languages and namespaces.
   */
  public translations: Record<string, any> = {};

  /**
   * Stores currency exchange rates.
   */
  public currencyRates: Record<string, any> = {};

  /**
   * Stores organization-specific localization configurations.
   */
  public organizationConfigs: Record<string, any> = {};

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Initialization code
  }

  /**
   * Initializes default translations for the service.
   */
  public initializeDefaultTranslations(): void {
    // Add logic to initialize default translations
  }

  /**
   * Placeholder for additional required asynchronous methods.
   */
  public async someOtherMethod(): Promise<void> {
    // Add logic for other required methods
  }

  /**
   * Returns the singleton instance of LocalizationService.
   * @returns {LocalizationService} The singleton instance.
   */
  public static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  // Existing methods

  /**
   * Fetches currency exchange rates for a base currency and optional target currencies.
   * @param {string} baseCurrency - The base currency code.
   * @param {string[]} [targetCurrencies] - Optional array of target currency codes.
   * @returns {Promise<any>} An object containing the base currency and rates.
   * @throws Will throw an error if baseCurrency is not provided.
   */
  public async getExchangeRates(baseCurrency: string, targetCurrencies?: string[]): Promise<any> {
    // Example implementation for fetching exchange rates
    if (!baseCurrency) {
      throw new Error('Base currency is required');
    }

    const rates = targetCurrencies?.reduce((acc, currency) => {
      acc[currency] = Math.random() * 100; // Example rate
      return acc;
    }, {} as Record<string, number>);

    return {
      baseCurrency,
      rates: rates || {}
    };
  }
}

export default router;

