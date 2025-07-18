import { Router } from 'express';
import { auditLogger } from './auditLogger.js';

export interface LocalizationConfig {
  organizationId: number;
  defaultLanguage: string;
  defaultCurrency: string;
  defaultTimezone: string;
  supportedLanguages: string[];
  supportedCurrencies: string[];
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currencyFormat: string;
}

export interface Translation {
  key: string;
  language: string;
  value: string;
  context?: string;
  pluralForms?: Record<string, string>;
}

export interface CurrencyRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface LocalizedContent {
  language: string;
  translations: Record<string, string>;
  currency: string;
  timezone: string;
  formats: {
    date: string;
    time: string;
    number: string;
    currency: string;
  };
}

export class LocalizationService {
  private static instance: LocalizationService;
  private translations: Map<string, Map<string, Translation>> = new Map();
  private currencyRates: Map<string, CurrencyRate> = new Map();
  private organizationConfigs: Map<number, LocalizationConfig> = new Map();

  static getInstance(): LocalizationService {
    if (!LocalizationService.instance) {
      LocalizationService.instance = new LocalizationService();
    }
    return LocalizationService.instance;
  }

  async initializeDefaultTranslations(): Promise<void> {
    const defaultTranslations = {
      // Common UI elements
      'common.save': {
        en: 'Save',
        es: 'Guardar',
        fr: 'Enregistrer',
        de: 'Speichern',
        it: 'Salva',
        pt: 'Salvar',
        ja: '保存',
        ko: '저장',
        zh: '保存',
        ru: 'Сохранить',
        ar: 'حفظ'
      },
      'common.cancel': {
        en: 'Cancel',
        es: 'Cancelar',
        fr: 'Annuler',
        de: 'Abbrechen',
        it: 'Annulla',
        pt: 'Cancelar',
        ja: 'キャンセル',
        ko: '취소',
        zh: '取消',
        ru: 'Отмена',
        ar: 'إلغاء'
      },
      'common.delete': {
        en: 'Delete',
        es: 'Eliminar',
        fr: 'Supprimer',
        de: 'Löschen',
        it: 'Elimina',
        pt: 'Excluir',
        ja: '削除',
        ko: '삭제',
        zh: '删除',
        ru: 'Удалить',
        ar: 'حذف'
      },
      'common.edit': {
        en: 'Edit',
        es: 'Editar',
        fr: 'Modifier',
        de: 'Bearbeiten',
        it: 'Modifica',
        pt: 'Editar',
        ja: '編集',
        ko: '편집',
        zh: '编辑',
        ru: 'Редактировать',
        ar: 'تحرير'
      },
      'common.loading': {
        en: 'Loading...',
        es: 'Cargando...',
        fr: 'Chargement...',
        de: 'Laden...',
        it: 'Caricamento...',
        pt: 'Carregando...',
        ja: '読み込み中...',
        ko: '로딩 중...',
        zh: '加载中...',
        ru: 'Загрузка...',
        ar: 'جاري التحميل...'
      },

      // Trip-related translations
      'trip.title': {
        en: 'Trip',
        es: 'Viaje',
        fr: 'Voyage',
        de: 'Reise',
        it: 'Viaggio',
        pt: 'Viagem',
        ja: '旅行',
        ko: '여행',
        zh: '旅行',
        ru: 'Поездка',
        ar: 'رحلة'
      },
      'trip.create': {
        en: 'Create Trip',
        es: 'Crear Viaje',
        fr: 'Créer un Voyage',
        de: 'Reise Erstellen',
        it: 'Crea Viaggio',
        pt: 'Criar Viagem',
        ja: '旅行を作成',
        ko: '여행 만들기',
        zh: '创建旅行',
        ru: 'Создать Поездку',
        ar: 'إنشاء رحلة'
      },
      'trip.destination': {
        en: 'Destination',
        es: 'Destino',
        fr: 'Destination',
        de: 'Ziel',
        it: 'Destinazione',
        pt: 'Destino',
        ja: '目的地',
        ko: '목적지',
        zh: '目的地',
        ru: 'Место назначения',
        ar: 'الوجهة'
      },
      'trip.budget': {
        en: 'Budget',
        es: 'Presupuesto',
        fr: 'Budget',
        de: 'Budget',
        it: 'Budget',
        pt: 'Orçamento',
        ja: '予算',
        ko: '예산',
        zh: '预算',
        ru: 'Бюджет',
        ar: 'الميزانية'
      },

      // Approval-related translations
      'approval.required': {
        en: 'Approval Required',
        es: 'Aprobación Requerida',
        fr: 'Approbation Requise',
        de: 'Genehmigung Erforderlich',
        it: 'Approvazione Richiesta',
        pt: 'Aprovação Necessária',
        ja: '承認が必要',
        ko: '승인 필요',
        zh: '需要批准',
        ru: 'Требуется Одобрение',
        ar: 'الموافقة مطلوبة'
      },
      'approval.approved': {
        en: 'Approved',
        es: 'Aprobado',
        fr: 'Approuvé',
        de: 'Genehmigt',
        it: 'Approvato',
        pt: 'Aprovado',
        ja: '承認済み',
        ko: '승인됨',
        zh: '已批准',
        ru: 'Одобрено',
        ar: 'موافق عليه'
      },
      'approval.rejected': {
        en: 'Rejected',
        es: 'Rechazado',
        fr: 'Rejeté',
        de: 'Abgelehnt',
        it: 'Rifiutato',
        pt: 'Rejeitado',
        ja: '拒否済み',
        ko: '거부됨',
        zh: '已拒绝',
        ru: 'Отклонено',
        ar: 'مرفوض'
      },

      // Policy-related translations
      'policy.violation': {
        en: 'Policy Violation',
        es: 'Violación de Política',
        fr: 'Violation de Politique',
        de: 'Richtlinienverstoß',
        it: 'Violazione della Politica',
        pt: 'Violação de Política',
        ja: 'ポリシー違反',
        ko: '정책 위반',
        zh: '政策违规',
        ru: 'Нарушение Политики',
        ar: 'انتهاك السياسة'
      },
      'policy.compliance': {
        en: 'Policy Compliance',
        es: 'Cumplimiento de Política',
        fr: 'Conformité aux Politiques',
        de: 'Richtlinien-Compliance',
        it: 'Conformità alle Politiche',
        pt: 'Conformidade com Políticas',
        ja: 'ポリシー遵守',
        ko: '정책 준수',
        zh: '政策合规',
        ru: 'Соблюдение Политики',
        ar: 'الامتثال للسياسة'
      },

      // Expense-related translations
      'expense.title': {
        en: 'Expense',
        es: 'Gasto',
        fr: 'Dépense',
        de: 'Ausgabe',
        it: 'Spesa',
        pt: 'Despesa',
        ja: '経費',
        ko: '비용',
        zh: '费用',
        ru: 'Расход',
        ar: 'المصروف'
      },
      'expense.receipt': {
        en: 'Receipt',
        es: 'Recibo',
        fr: 'Reçu',
        de: 'Beleg',
        it: 'Ricevuta',
        pt: 'Recibo',
        ja: 'レシート',
        ko: '영수증',
        zh: '收据',
        ru: 'Чек',
        ar: 'الإيصال'
      }
    };

    // Load translations into memory
    for (const [key, translations] of Object.entries(defaultTranslations)) {
      const translationMap = new Map<string, Translation>();
      
      for (const [lang, value] of Object.entries(translations)) {
        translationMap.set(lang, {
          key,
          language: lang,
          value,
          context: 'default'
        });
      }
      
      this.translations.set(key, translationMap);
    }
  }

  async initializeDefaultCurrencyRates(): Promise<void> {
    // Mock currency rates - in production, fetch from a real API like exchangerate-api.com
    const baseCurrency = 'USD';
    const rates = {
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110.0,
      'CAD': 1.25,
      'AUD': 1.35,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'BRL': 5.2,
      'MXN': 20.1,
      'KRW': 1180.0,
      'SGD': 1.35,
      'HKD': 7.8,
      'SEK': 8.6,
      'NOK': 8.9,
      'DKK': 6.3,
      'PLN': 3.9,
      'CZK': 21.5,
      'HUF': 295.0,
      'RUB': 73.5,
      'TRY': 8.4,
      'ZAR': 14.2,
      'AED': 3.67,
      'SAR': 3.75
    };

    const timestamp = new Date();
    
    // USD to other currencies
    for (const [currency, rate] of Object.entries(rates)) {
      this.currencyRates.set(`${baseCurrency}-${currency}`, {
        fromCurrency: baseCurrency,
        toCurrency: currency,
        rate,
        timestamp,
        source: 'mock'
      });
      
      // Reverse rate
      this.currencyRates.set(`${currency}-${baseCurrency}`, {
        fromCurrency: currency,
        toCurrency: baseCurrency,
        rate: 1 / rate,
        timestamp,
        source: 'mock'
      });
    }

    // Cross-currency rates (simplified)
    const currencies = Object.keys(rates);
    for (const fromCurrency of currencies) {
      for (const toCurrency of currencies) {
        if (fromCurrency !== toCurrency) {
          const fromRate = rates[fromCurrency as keyof typeof rates];
          const toRate = rates[toCurrency as keyof typeof rates];
          const crossRate = toRate / fromRate;
          
          this.currencyRates.set(`${fromCurrency}-${toCurrency}`, {
            fromCurrency,
            toCurrency,
            rate: crossRate,
            timestamp,
            source: 'calculated'
          });
        }
      }
    }
  }

  async configureOrganization(organizationId: number, config: Partial<LocalizationConfig>): Promise<LocalizationConfig> {
    const defaultConfig: LocalizationConfig = {
      organizationId,
      defaultLanguage: 'en',
      defaultCurrency: 'USD',
      defaultTimezone: 'UTC',
      supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'ar'],
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'],
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm',
      numberFormat: '#,##0.00',
      currencyFormat: '¤#,##0.00'
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.organizationConfigs.set(organizationId, finalConfig);

    await auditLogger.log({
      organizationId,
      action: 'localization_configured',
      entityType: 'organization',
      entityId: organizationId,
      details: {
        defaultLanguage: finalConfig.defaultLanguage,
        defaultCurrency: finalConfig.defaultCurrency,
        supportedLanguages: finalConfig.supportedLanguages.length,
        supportedCurrencies: finalConfig.supportedCurrencies.length
      }
    });

    return finalConfig;
  }

  async getTranslation(key: string, language: string, context?: string): Promise<string> {
    const translationMap = this.translations.get(key);
    if (!translationMap) {
      return key; // Return key if no translation found
    }

    const translation = translationMap.get(language);
    if (!translation) {
      // Fallback to English
      const fallback = translationMap.get('en');
      return fallback?.value || key;
    }

    return translation.value;
  }

  async getTranslations(keys: string[], language: string): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    for (const key of keys) {
      translations[key] = await this.getTranslation(key, language);
    }
    
    return translations;
  }

  async getAllTranslationsForLanguage(language: string): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    for (const [key, translationMap] of this.translations.entries()) {
      const translation = translationMap.get(language);
      if (translation) {
        translations[key] = translation.value;
      } else {
        // Fallback to English
        const fallback = translationMap.get('en');
        translations[key] = fallback?.value || key;
      }
    }
    
    return translations;
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rateKey = `${fromCurrency}-${toCurrency}`;
    const rate = this.currencyRates.get(rateKey);
    
    if (!rate) {
      throw new Error(`Currency conversion rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    return amount * rate.rate;
  }

  async getCurrencyRate(fromCurrency: string, toCurrency: string): Promise<CurrencyRate | null> {
    const rateKey = `${fromCurrency}-${toCurrency}`;
    return this.currencyRates.get(rateKey) || null;
  }

  async formatCurrency(amount: number, currency: string, language: string): Promise<string> {
    try {
      return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: currency
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      const currencySymbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$',
        'CHF': 'CHF',
        'CNY': '¥',
        'INR': '₹',
        'BRL': 'R$'
      };
      
      const symbol = currencySymbols[currency] || currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  async formatDate(date: Date, language: string, timezone?: string): Promise<string> {
    try {
      return new Intl.DateTimeFormat(language, {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (error) {
      return date.toISOString().split('T')[0];
    }
  }

  async formatTime(date: Date, language: string, timezone?: string): Promise<string> {
    try {
      return new Intl.DateTimeFormat(language, {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toTimeString().split(' ')[0].substring(0, 5);
    }
  }

  async formatNumber(number: number, language: string): Promise<string> {
    try {
      return new Intl.NumberFormat(language).format(number);
    } catch (error) {
      return number.toLocaleString();
    }
  }

  async getLocalizedContent(organizationId: number, language?: string, currency?: string): Promise<LocalizedContent> {
    const config = this.organizationConfigs.get(organizationId);
    const finalLanguage = language || config?.defaultLanguage || 'en';
    const finalCurrency = currency || config?.defaultCurrency || 'USD';
    const timezone = config?.defaultTimezone || 'UTC';

    const translations = await this.getAllTranslationsForLanguage(finalLanguage);

    return {
      language: finalLanguage,
      translations,
      currency: finalCurrency,
      timezone,
      formats: {
        date: config?.dateFormat || 'YYYY-MM-DD',
        time: config?.timeFormat || 'HH:mm',
        number: config?.numberFormat || '#,##0.00',
        currency: config?.currencyFormat || '¤#,##0.00'
      }
    };
  }

  async addTranslation(key: string, language: string, value: string, context?: string): Promise<void> {
    let translationMap = this.translations.get(key);
    if (!translationMap) {
      translationMap = new Map();
      this.translations.set(key, translationMap);
    }

    translationMap.set(language, {
      key,
      language,
      value,
      context
    });
  }

  async updateCurrencyRates(rates: Record<string, number>, baseCurrency: string = 'USD'): Promise<void> {
    const timestamp = new Date();
    
    for (const [currency, rate] of Object.entries(rates)) {
      this.currencyRates.set(`${baseCurrency}-${currency}`, {
        fromCurrency: baseCurrency,
        toCurrency: currency,
        rate,
        timestamp,
        source: 'api'
      });
      
      // Reverse rate
      this.currencyRates.set(`${currency}-${baseCurrency}`, {
        fromCurrency: currency,
        toCurrency: baseCurrency,
        rate: 1 / rate,
        timestamp,
        source: 'api'
      });
    }
  }

  async getSupportedLanguages(organizationId?: number): Promise<string[]> {
    if (organizationId) {
      const config = this.organizationConfigs.get(organizationId);
      return config?.supportedLanguages || ['en'];
    }
    
    return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'ar'];
  }

  async getSupportedCurrencies(organizationId?: number): Promise<string[]> {
    if (organizationId) {
      const config = this.organizationConfigs.get(organizationId);
      return config?.supportedCurrencies || ['USD'];
    }
    
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL'];
  }
}

export const localizationService = LocalizationService.getInstance();

// Initialize default data
localizationService.initializeDefaultTranslations();
localizationService.initializeDefaultCurrencyRates();
