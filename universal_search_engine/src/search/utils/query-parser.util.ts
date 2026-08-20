export interface ParsedAdvancedQuery {
  cleanQuery: string;
  author?: string;
  after?: string;
  before?: string;
  year?: number;
  doi?: string;
  isbn?: string;
  type?: string;
  journal?: string;
  publisher?: string;
  free?: boolean;
  pdf?: boolean;
  open_access?: boolean;
  peer_reviewed?: boolean;
}

export function parseAdvancedQuery(rawQuery: string): ParsedAdvancedQuery {
  if (!rawQuery) {
    return { cleanQuery: '' };
  }

  let cleanQuery = rawQuery;
  const result: ParsedAdvancedQuery = { cleanQuery: '' };

  // Match key:"quoted value" or key:value
  const kvRegex =
    /(?:(author|after|before|year|doi|isbn|type|journal|publisher|free|pdf|open_access|peer_reviewed):(?:"([^"]+)"|(\S+)))/gi;

  let match: RegExpExecArray | null;
  while ((match = kvRegex.exec(rawQuery)) !== null) {
    const key = match[1].toLowerCase();
    const val = match[2] !== undefined ? match[2] : match[3];

    cleanQuery = cleanQuery.replace(match[0], '');

    if (key === 'author') result.author = val;
    else if (key === 'after') result.after = val;
    else if (key === 'before') result.before = val;
    else if (key === 'year') {
      const parsedYear = parseInt(val, 10);
      if (!isNaN(parsedYear)) result.year = parsedYear;
    } else if (key === 'doi') result.doi = val;
    else if (key === 'isbn') result.isbn = val;
    else if (key === 'type') result.type = val;
    else if (key === 'journal') result.journal = val;
    else if (key === 'publisher') result.publisher = val;
    else if (key === 'free') result.free = val.toLowerCase() !== 'false';
    else if (key === 'pdf') result.pdf = val.toLowerCase() !== 'false';
    else if (key === 'open_access')
      result.open_access = val.toLowerCase() !== 'false';
    else if (key === 'peer_reviewed')
      result.peer_reviewed = val.toLowerCase() !== 'false';
  }

  // Handle standalone boolean flag tokens (e.g. "free", "pdf", "open_access", "peer_reviewed")
  const standaloneTokens = ['free', 'pdf', 'open_access', 'peer_reviewed'];
  standaloneTokens.forEach((token) => {
    // Only parse as standalone flag if not already set by key:value
    if ((result as any)[token] === undefined) {
      const wordRegex = new RegExp(`\\b${token}\\b`, 'gi');
      if (wordRegex.test(cleanQuery)) {
        cleanQuery = cleanQuery.replace(wordRegex, '');
        (result as any)[token] = true;
      }
    }
  });

  result.cleanQuery = cleanQuery.replace(/\s+/g, ' ').trim();
  return result;
}
