/**
 * Web Search Module for MedChat AI
 * Provides real-time medical information via WHO + PubMed APIs.
 * All APIs are FREE and require NO API keys.
 *
 * Sources:
 *  1. WHO GHO (Global Health Observatory) — health statistics, disease indicators
 *  2. WHO Disease Outbreak News — latest disease outbreaks worldwide
 *  3. PubMed (NCBI) — peer-reviewed research papers
 */

// ─── WHO GHO OData API (Free, no key) ────────────────────
const WHO_GHO_BASE = 'https://ghoapi.azureedge.net/api';

// ─── WHO Disease Outbreak News (internal API) ─────────────
const WHO_DON_URL = 'https://www.who.int/api/news/diseaseoutbreaknews';

// ─── PubMed E-utilities (Free, no key) ───────────────────
const PUBMED_SEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const PUBMED_SUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// ─── Fetch with timeout helper ────────────────────────────
function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ─── WHO GHO Indicator Mapping ───────────────────────────
// Maps common medical terms to WHO GHO indicator codes
const WHO_INDICATOR_MAP = {
  'life expectancy': 'WHOSIS_000001',
  'mortality': 'NCDMORT3070',
  'neonatal mortality': 'MDG_0000000001',
  'infant mortality': 'MDG_0000000003',
  'maternal mortality': 'MDG_0000000026',
  'tuberculosis': 'MDG_0000000020',
  'tb': 'MDG_0000000020',
  'malaria': 'MALARIA_EST_DEATHS',
  'hiv': 'HIV_0000000026',
  'aids': 'HIV_0000000026',
  'hepatitis': 'HEP_NEW_INF_RATE',
  'diabetes': 'NCD_BMI_30A',
  'obesity': 'NCD_BMI_30A',
  'blood pressure': 'NCD_HYP_PREVALENCE_A',
  'hypertension': 'NCD_HYP_PREVALENCE_A',
  'smoking': 'TOBACCO_0000000251',
  'tobacco': 'TOBACCO_0000000251',
  'alcohol': 'SA_0000001462',
  'immunization': 'WHS4_543',
  'vaccination': 'WHS4_543',
  'clean water': 'WSH_WATER_BASIC',
  'sanitation': 'WSH_SANITATION_BASIC',
  'cholera': 'CHOLERA_0000000019',
  'suicide': 'SDGSUICIDE',
  'road traffic': 'RS_196',
  'air pollution': 'AIR_5',
  'mental health': 'MH_12',
};

// ─── Smart Trigger: Should we search the web? ─────────────
const TEMPORAL_WORDS = [
  'latest', 'recent', 'new', 'current', 'updated', 'modern',
  '2024', '2025', '2026', '2027', 'today', 'nowadays',
  'guideline', 'guidelines', 'protocol', 'recommendation',
];

const SEARCH_TRIGGER_WORDS = [
  // Drug-related
  'drug', 'medication', 'medicine', 'dose', 'dosage', 'side effect',
  'interaction', 'contraindication', 'prescription', 'generic',
  // Research/evidence
  'study', 'research', 'trial', 'evidence', 'clinical trial',
  'pubmed', 'journal', 'paper', 'published',
  // Treatment-related
  'treatment for', 'cure for', 'therapy for', 'vaccine',
  'procedure', 'surgery', 'alternative treatment',
  // Specific medical queries
  'survival rate', 'prognosis', 'mortality', 'incidence',
  'prevalence', 'outbreak', 'epidemic', 'pandemic',
  'fda approved', 'who recommendation', 'who guidelines',
  // WHO-specific
  'world health', 'who says', 'who report', 'global health',
  'disease outbreak', 'statistics', 'death rate', 'cases',
  // Comparison queries
  'vs', 'versus', 'compared to', 'better than', 'difference between',
];

const SKIP_PATTERNS = [
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|good morning|good night)/i,
  /^(my answer|option [a-d])/i,
  /^.{0,8}$/,  // Very short messages
];

/**
 * Determines if a query should trigger a web search.
 */
export function shouldSearchWeb(query, isMcqAnswer = false) {
  if (!query || isMcqAnswer) return false;
  const q = query.toLowerCase().trim();

  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(q)) return false;
  }
  for (const word of TEMPORAL_WORDS) {
    if (q.includes(word)) return true;
  }
  for (const word of SEARCH_TRIGGER_WORDS) {
    if (q.includes(word)) return true;
  }
  if (/\b(what|how|why|when|where|which|can|does|is there|are there)\b/i.test(q) && q.length > 20) {
    return true;
  }
  return false;
}

// ─── WHO GHO: Health Statistics ──────────────────────────
function findWHOIndicator(query) {
  const q = query.toLowerCase();
  for (const [keyword, code] of Object.entries(WHO_INDICATOR_MAP)) {
    if (q.includes(keyword)) return { keyword, code };
  }
  return null;
}

async function searchWHOStats(query) {
  const indicator = findWHOIndicator(query);
  if (!indicator) return null;

  try {
    const url = `${WHO_GHO_BASE}/${indicator.code}?$filter=TimeDim ge 2020&$orderby=TimeDim desc&$top=15`;
    const res = await fetchWithTimeout(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) return null;

    const data = await res.json();
    const records = data?.value || [];
    if (records.length === 0) return null;

    // Group by country, take latest per country
    const byCountry = {};
    for (const r of records) {
      const country = r.SpatialDim || 'Global';
      if (!byCountry[country] || r.TimeDim > byCountry[country].TimeDim) {
        byCountry[country] = r;
      }
    }

    const results = Object.values(byCountry).slice(0, 10).map(r => ({
      country: r.SpatialDim || 'Global',
      year: r.TimeDim,
      value: r.NumericValue != null ? r.NumericValue : r.Value,
      indicator: indicator.keyword,
      indicatorCode: indicator.code,
    }));

    return {
      indicator: indicator.keyword,
      indicatorCode: indicator.code,
      data: results,
      source: `WHO Global Health Observatory (GHO)`,
      url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${indicator.code}`,
    };
  } catch (err) {
    console.warn('WHO GHO search error:', err);
    return null;
  }
}

// ─── WHO Disease Outbreak News ───────────────────────────
async function searchWHOOutbreaks(query) {
  try {
    const url = `${WHO_DON_URL}?$orderby=PublicationDate desc&$top=5`;
    const res = await fetchWithTimeout(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.value || [];
    if (items.length === 0) return [];

    const q = query.toLowerCase();
    // Filter by relevance to query if possible
    let filtered = items.filter(item => {
      const title = (item.Title || '').toLowerCase();
      const summary = (item.Summary || '').toLowerCase();
      return q.split(' ').some(word =>
        word.length > 3 && (title.includes(word) || summary.includes(word))
      );
    });

    // If no relevant matches, return latest outbreaks
    if (filtered.length === 0) filtered = items.slice(0, 3);

    return filtered.slice(0, 5).map(item => ({
      title: item.Title || 'Untitled',
      date: item.PublicationDate ? new Date(item.PublicationDate).toLocaleDateString() : '',
      summary: (item.Summary || '').slice(0, 300),
      url: item.UrlName
        ? `https://www.who.int/emergencies/disease-outbreak-news/${item.UrlName}`
        : 'https://www.who.int/emergencies/disease-outbreak-news',
    }));
  } catch (err) {
    console.warn('WHO Outbreak News error:', err);
    return [];
  }
}

// ─── PubMed Search ────────────────────────────────────────
async function searchPubMed(query) {
  try {
    const searchUrl = `${PUBMED_SEARCH_URL}?db=pubmed&term=${encodeURIComponent(query)}&retmax=3&retmode=json&sort=relevance`;
    const searchRes = await fetchWithTimeout(`${CORS_PROXY}${encodeURIComponent(searchUrl)}`);
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const summaryUrl = `${PUBMED_SUMMARY_URL}?db=pubmed&id=${ids.join(',')}&retmode=json`;
    const summaryRes = await fetchWithTimeout(`${CORS_PROXY}${encodeURIComponent(summaryUrl)}`);
    if (!summaryRes.ok) return [];

    const summaryData = await summaryRes.json();
    const results = [];

    for (const id of ids) {
      const article = summaryData?.result?.[id];
      if (!article) continue;
      results.push({
        title: article.title || '',
        authors: (article.authors || []).slice(0, 3).map(a => a.name).join(', '),
        journal: article.fulljournalname || article.source || '',
        year: article.pubdate?.split(' ')[0] || '',
        pmid: id,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      });
    }
    return results;
  } catch (err) {
    console.warn('PubMed search error:', err);
    return [];
  }
}



// ─── Main Search Orchestrator ─────────────────────────────
/**
 * Performs web search using selected sources.
 * @param {string} query - The user's medical query
 * @param {{ searchapi?: boolean, who?: boolean, pubmed?: boolean }} enabledSources - Which sources to query
 * @returns {Promise<{context: string, sources: Array, searchedWith: string[], images: string[]}>}
 */
export async function searchWeb(query, enabledSources = { who: true, pubmed: true }, timeoutMs = 8000) {
  // Wrap entire search in a global timeout so it never blocks the AI response
  const searchPromise = _searchWebInternal(query, enabledSources);
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve({ context: '', sources: [], searchedWith: [], images: [] }), timeoutMs)
  );
  return Promise.race([searchPromise, timeoutPromise]);
}

async function _searchWebInternal(query, enabledSources = { who: true, pubmed: true }) {
  const searchedWith = [];
  let whoStats = null;
  let whoOutbreaks = [];
  let pubmedResults = [];

  // Build promises array based on enabled sources
  const promises = [];
  const promiseKeys = [];

  if (enabledSources.who) {
    promises.push(searchWHOStats(query));
    promiseKeys.push('stats');
    promises.push(searchWHOOutbreaks(query));
    promiseKeys.push('outbreaks');
  }
  if (enabledSources.pubmed) {
    promises.push(searchPubMed(query));
    promiseKeys.push('pubmed');
  }
  if (promises.length === 0) {
    return { context: '', sources: [], searchedWith: [], images: [] };
  }

  const results = await Promise.allSettled(promises);

  // Map results back to their keys
  const resultMap = {};
  promiseKeys.forEach((key, i) => { resultMap[key] = results[i]; });

  if (resultMap.stats?.status === 'fulfilled' && resultMap.stats.value) {
    whoStats = resultMap.stats.value;
    searchedWith.push('WHO');
  }

  if (resultMap.outbreaks?.status === 'fulfilled' && resultMap.outbreaks.value?.length > 0) {
    whoOutbreaks = resultMap.outbreaks.value;
    if (!searchedWith.includes('WHO')) searchedWith.push('WHO');
  }

  if (resultMap.pubmed?.status === 'fulfilled' && resultMap.pubmed.value?.length > 0) {
    pubmedResults = resultMap.pubmed.value;
    searchedWith.push('PubMed');
  }

  // If no results from any source, return empty
  if (!whoStats && whoOutbreaks.length === 0 && pubmedResults.length === 0) {
    return { context: '', sources: [], searchedWith: [], images: [] };
  }

  // Build formatted context for AI prompt injection
  let context = '';
  const sources = [];

  // WHO Health Statistics
  if (whoStats && whoStats.data.length > 0) {
    context += `### WHO Global Health Statistics — ${whoStats.indicator.toUpperCase()}:\n`;
    context += `Source: ${whoStats.source}\n`;
    context += `Indicator: ${whoStats.indicatorCode}\n\n`;
    context += '| Country | Year | Value |\n|---------|------|-------|\n';
    whoStats.data.forEach(d => {
      context += `| ${d.country} | ${d.year} | ${d.value} |\n`;
    });
    context += '\n';
    sources.push({
      type: 'who',
      title: `WHO GHO: ${whoStats.indicator} statistics`,
      url: whoStats.url,
    });
  }

  // WHO Disease Outbreak News
  if (whoOutbreaks.length > 0) {
    context += '### WHO Disease Outbreak News (Latest):\n';
    whoOutbreaks.forEach((o, i) => {
      context += `[O${i + 1}] "${o.title}" (${o.date})\n${o.summary}\nLink: ${o.url}\n\n`;
      sources.push({ type: 'who', title: o.title, url: o.url });
    });
  }

  // PubMed Research Papers
  if (pubmedResults.length > 0) {
    context += '### PubMed Research Papers:\n';
    pubmedResults.forEach((r, i) => {
      context += `[P${i + 1}] "${r.title}" — ${r.authors} (${r.journal}, ${r.year}) — PMID: ${r.pmid}\n`;
      context += `Link: ${r.url}\n\n`;
      sources.push({
        type: 'pubmed', title: r.title, url: r.url,
        pmid: r.pmid, journal: r.journal, year: r.year,
      });
    });
  }

  return { context, sources, searchedWith, images: [] };
}

