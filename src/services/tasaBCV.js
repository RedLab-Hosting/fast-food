// BCV Exchange Rate Service
// Fetches USD/VES rate from bcv.org.ve or uses manual rate

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

const BCV_URL = 'https://www.bcv.org.ve/';

export async function fetchTasaBCV() {
  let lastError = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(proxy + encodeURIComponent(BCV_URL), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const html = await resp.text();

      // Parse the dollar rate from BCV HTML
      // Looking for: <div id="dolar" ...> ... <strong> 431,01130000 </strong>
      const dolarMatch = html.match(/<div\s+id="dolar"[^>]*>[\s\S]*?<strong>\s*([\d.,]+)\s*<\/strong>/i);
      if (dolarMatch) {
        // Convert Venezuelan format (431,01130000) to number
        const rawValue = dolarMatch[1].trim();
        // Replace dots (thousands) and comma (decimal)
        const numValue = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
        if (!isNaN(numValue) && numValue > 0) {
          // Round to 2 decimals
          return Math.round(numValue * 100) / 100;
        }
      }

      throw new Error('Could not parse dollar rate from BCV page');
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error('Failed to fetch BCV rate');
}

export function formatearBs(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '0,00';
  // Formato: 1.234,56 (dot thousands, comma decimals)
  return Number(monto).toLocaleString('es-VE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function formatearUSD(monto) {
  if (monto === null || monto === undefined || isNaN(monto)) return '0.00';
  // Formato: 1,234.56 (comma thousands, dot decimals)
  return Number(monto).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Retro-compatibilidad manual hasta migrar todo
export function formatBs(usd, tasa) {
  if (!tasa || tasa <= 0) return null;
  const bs = usd * tasa;
  return bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
