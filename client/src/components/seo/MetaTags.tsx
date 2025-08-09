import React, { useEffect } from 'react';
import { SEOMetadata } from '@/lib/seo/metadata';

interface MetaTagsProps extends SEOMetadata {
  children?: React.ReactNode;
}

export default function MetaTags({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  canonicalUrl,
  structuredData,
  noindex = false,
  children 
}: MetaTagsProps) {
  const siteName = 'Remvana';
  const twitterHandle = '@remvana';
  const baseUrl = import.meta.env.VITE_BASE_URL || 'https://remvana.app';
  const fullOgImage = ogImage?.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;
  
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Helper function to update or create meta tags
    const updateMetaTag = (selector: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        const [attr, value] = selector.replace('meta[', '').replace(']', '').split('=');
        element.setAttribute(attr, value.replace(/"/g, ''));
        document.head.appendChild(element);
      }
      element.content = content;
    };
    
    // Update meta tags
    updateMetaTag('meta[name="description"]', description);
    if (keywords && keywords.length > 0) {
      updateMetaTag('meta[name="keywords"]', keywords.join(', '));
    }
    
    // Robots
    updateMetaTag('meta[name="robots"]', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    
    // Open Graph
    updateMetaTag('meta[property="og:title"]', title);
    updateMetaTag('meta[property="og:description"]', description);
    updateMetaTag('meta[property="og:type"]', 'website');
    updateMetaTag('meta[property="og:site_name"]', siteName);
    if (fullOgImage) {
      updateMetaTag('meta[property="og:image"]', fullOgImage);
    }
    if (canonicalUrl) {
      updateMetaTag('meta[property="og:url"]', canonicalUrl);
    }
    
    // Twitter
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:site"]', twitterHandle);
    updateMetaTag('meta[name="twitter:title"]', title);
    updateMetaTag('meta[name="twitter:description"]', description);
    if (fullOgImage) {
      updateMetaTag('meta[name="twitter:image"]', fullOgImage);
    }
    
    // Canonical URL
    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = canonicalUrl;
    }
    
    // Structured Data
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }
    
    // Cleanup function
    return () => {
      // Optionally clean up meta tags on unmount
    };
  }, [title, description, keywords, ogImage, canonicalUrl, structuredData, noindex, fullOgImage, siteName, twitterHandle]);
  
  return null;
}