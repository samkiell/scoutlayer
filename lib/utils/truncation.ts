export function truncateRepoDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  if (desc.length <= 200) return desc;
  return desc.slice(0, 200) + '...';
}

export function truncateDeckText(text: string | null | undefined): string | null {
  if (!text) return null;
  if (text.length <= 2000) return text;
  return text.slice(0, 2000) + '...';
}

export function truncateLongField(text: string | null | undefined, limit = 1000): string | null {
  if (!text) return null;
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
}

export function checkTokenBudget(prompt: string, maxTokens = 8000): { tokens: number; safe: boolean } {
  const estimatedTokens = Math.ceil(prompt.length / 4);
  if (estimatedTokens > maxTokens) {
    console.warn(
      `[Token Budget Warning] Constructed prompt is estimated at ${estimatedTokens} tokens, which exceeds the safe threshold of ${maxTokens} tokens (TPM limit: 12000). Length: ${prompt.length} chars.`
    );
  }
  return { tokens: estimatedTokens, safe: estimatedTokens <= maxTokens };
}
