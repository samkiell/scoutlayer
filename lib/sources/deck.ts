/**
 * Deck extraction utilities for ScoutLayer.
 *
 * Currently supports lightweight plain-text extraction from public Google Slides
 * via the export/txt endpoint. Other formats (Notion, PDF, generic URLs) are
 * intentionally not fetched; they are reported as unsupported so downstream
 * stages can disclose the gap honestly.
 */

const GOOGLE_SLIDES_PATTERN = /docs\.google\.com\/presentation\/d\/([^/?#]+)/i;

export type DeckExtractError = {
  ok: boolean;
  analyzed: false;
  reason: string;
  text?: string;
};

export type DeckExtractOk = {
  ok: true;
  analyzed: true;
  reason: null;
  text: string;
};

export type DeckExtractResult = DeckExtractOk | DeckExtractError;

export function isGoogleSlidesUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  return GOOGLE_SLIDES_PATTERN.test(url);
}

export function extractSlidesId(url: string): string | null {
  const match = url.match(GOOGLE_SLIDES_PATTERN);
  return match ? match[1] : null;
}

export function extractClaimFromDeckText(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const sentences = cleaned.split(/[.\n!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  const withNumber = sentences.find((s) => /\d+/.test(s));
  if (withNumber) {
    return withNumber.length > 200 ? `${withNumber.slice(0, 200)}...` : withNumber;
  }
  const first = sentences[0] || cleaned.slice(0, 200);
  return first.length > 200 ? `${first.slice(0, 200)}...` : first;
}

export async function extractDeckText(url: string | null | undefined): Promise<DeckExtractResult> {
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return {
      ok: true,
      analyzed: false,
      reason: 'No deck link provided',
      text: '',
    };
  }

  const trimmed = url.trim();

  if (!isGoogleSlidesUrl(trimmed)) {
    return {
      ok: true,
      analyzed: false,
      reason: `Unsupported deck format: ${new URL(trimmed).hostname}`,
      text: '',
    };
  }

  const presentationId = extractSlidesId(trimmed);
  if (!presentationId) {
    return {
      ok: true,
      analyzed: false,
      reason: 'Could not parse Google Slides presentation ID',
      text: '',
    };
  }

  const exportUrl = `https://docs.google.com/presentation/d/${presentationId}/export/txt`;

  try {
    const response = await fetch(exportUrl, {
      headers: {
        Accept: 'text/plain',
      },
    });

    if (!response.ok) {
      return {
        ok: true,
        analyzed: false,
        reason: `Google Slides export failed (HTTP ${response.status})`,
        text: '',
      };
    }

    const text = await response.text();

    if (!text || text.trim().length === 0) {
      return {
        ok: true,
        analyzed: false,
        reason: 'Google Slides deck appears empty or access-restricted',
        text: '',
      };
    }

    const truncated = text.length > 2000 ? `${text.slice(0, 2000)}...` : text;

    return {
      ok: true,
      analyzed: true,
      reason: null,
      text: truncated,
    };
  } catch (err: any) {
    return {
      ok: true,
      analyzed: false,
      reason: `Failed to fetch deck content: ${err?.message ?? 'Network error'}`,
      text: '',
    };
  }
}
