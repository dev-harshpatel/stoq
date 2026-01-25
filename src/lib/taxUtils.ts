/**
 * Tax calculation utilities for HST/GST and sales tax
 */

import { supabase } from './supabase/client';

/**
 * Get tax rate for a given location
 * @param country - Country name ('Canada' or 'USA')
 * @param state - State or province name
 * @param city - Optional city name (for city-specific rates)
 * @returns Tax rate as decimal (e.g., 0.13 for 13%)
 */
export async function getTaxRate(
  country: string,
  state: string,
  city?: string | null
): Promise<number> {
  try {
    if (!country || !state) {
      return 0;
    }

    // First try to find city-specific rate if city is provided
    if (city) {
      const { data: cityRate, error: cityError } = await supabase
        .from('tax_rates')
        .select('tax_rate')
        .eq('country', country)
        .eq('state_province', state)
        .eq('city', city)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (!cityError && cityRate) {
        const rate = cityRate as { tax_rate: number };
        return Number(rate.tax_rate) / 100;
      }
    }

    // Fall back to state-level rate
    const { data: stateRate, error: stateError } = await supabase
      .from('tax_rates')
      .select('tax_rate')
      .eq('country', country)
      .eq('state_province', state)
      .is('city', null)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (!stateError && stateRate) {
      const rate = stateRate as { tax_rate: number };
      return Number(rate.tax_rate) / 100;
    }

    // No rate found - return 0
    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate tax amount from subtotal
 * @param subtotal - Subtotal amount
 * @param taxRate - Tax rate as decimal (e.g., 0.13 for 13%)
 * @returns Tax amount
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

/**
 * Get tax type (GST, HST, or Sales Tax) for a location
 * @param country - Country name ('Canada' or 'USA')
 * @param state - State or province name
 * @returns Tax type string
 */
export async function getTaxType(
  country: string,
  state: string
): Promise<string> {
  try {
    if (!country || !state) {
      return 'Tax';
    }

    const { data, error } = await supabase
      .from('tax_rates')
      .select('tax_type')
      .eq('country', country)
      .eq('state_province', state)
      .is('city', null)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      const taxData = data as { tax_type?: string };
      return taxData.tax_type || 'Tax';
    }

    // Default based on country
    return country === 'Canada' ? 'GST/HST' : 'Sales Tax';
  } catch (error) {
    return country === 'Canada' ? 'GST/HST' : 'Sales Tax';
  }
}

/**
 * Get tax rate and type together
 * @param country - Country name
 * @param state - State or province name
 * @param city - Optional city name
 * @returns Object with taxRate (decimal) and taxType (string)
 */
export async function getTaxInfo(
  country: string,
  state: string,
  city?: string | null
): Promise<{ taxRate: number; taxType: string; taxRatePercent: number }> {
  const [taxRate, taxType] = await Promise.all([
    getTaxRate(country, state, city),
    getTaxType(country, state),
  ]);

  return {
    taxRate,
    taxType,
    taxRatePercent: taxRate * 100,
  };
}
