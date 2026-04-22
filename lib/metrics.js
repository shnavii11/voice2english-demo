/**
 * Word Error Rate (WER) = edit_distance(hyp_words, ref_words) / ref_length
 */
export function computeWER(hypothesis, reference) {
  const hyp = hypothesis.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ref = reference.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;

  const m = ref.length, n = hyp.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = ref[i - 1] === hyp[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n] / m;
}

/**
 * Corpus BLEU (1–4 grams, uniform weights) — sacrebleu-compatible.
 */
export function computeBLEU(hypothesis, reference) {
  const hyp = hypothesis.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const ref = reference.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (hyp.length === 0) return 0;

  const maxN = Math.min(4, ref.length, hyp.length);
  if (maxN === 0) return 0;

  let logSum = 0;
  for (let n = 1; n <= maxN; n++) {
    const hypNg = ngrams(hyp, n);
    const refNg = ngrams(ref, n);
    let clipped = 0;
    for (const [gram, cnt] of hypNg) clipped += Math.min(cnt, refNg.get(gram) ?? 0);
    const total = Math.max(1, hyp.length - n + 1);
    if (clipped === 0) return 0;
    logSum += Math.log(clipped / total);
  }

  const bp = hyp.length >= ref.length ? 1 : Math.exp(1 - ref.length / hyp.length);
  return bp * Math.exp(logSum / maxN);
}

function ngrams(tokens, n) {
  const counts = new Map();
  for (let i = 0; i <= tokens.length - n; i++) {
    const g = tokens.slice(i, i + n).join(' ');
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  return counts;
}
