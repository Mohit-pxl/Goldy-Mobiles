// Simple shared store for passing scanned barcode data between screens
// This avoids expo-router param passing issues with fullScreenModal

let _pendingCode: string | null = null;
let _pendingRawTarget: string | null = null;
let _pendingProduct: any = null;

// For simple raw barcode string (used in add-stock)
export const setScanResult = (code: string) => { _pendingCode = code; };
export const consumeScanResult = (): string | null => { const c = _pendingCode; _pendingCode = null; return c; };

// For raw barcode string targeting a specific productId (used in billing item rows)
export const setTargetedScanResult = (code: string, targetId: string) => { _pendingCode = code; _pendingRawTarget = targetId; };
export const consumeTargetedScanResult = (): { code: string; targetId: string } | null => {
  if (!_pendingCode || !_pendingRawTarget) return null;
  const res = { code: _pendingCode, targetId: _pendingRawTarget };
  _pendingCode = null;
  _pendingRawTarget = null;
  return res;
};

// For resolved product from barcode (used in billing main scan)
export const setResolvedProduct = (product: any, identifier?: string) => { _pendingProduct = { product, identifier }; };
export const consumeResolvedProduct = () => { const p = _pendingProduct; _pendingProduct = null; return p; };
