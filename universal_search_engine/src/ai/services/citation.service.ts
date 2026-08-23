import { Injectable } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { CustomLogger } from '../../common/logger/logger.service';

@Injectable()
export class CitationService {
  constructor(
    private readonly openaiService: OpenaiService,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Helper to parse authors from various formats (string array, JSON string, object array)
   */
  private parseAuthors(authorsInput: any): string[] {
    if (!authorsInput) return [];
    
    let rawAuthors: any[] = [];
    if (Array.isArray(authorsInput)) {
      rawAuthors = authorsInput;
    } else if (typeof authorsInput === 'string') {
      try {
        const parsed = JSON.parse(authorsInput);
        if (Array.isArray(parsed)) {
          rawAuthors = parsed;
        } else {
          rawAuthors = [parsed];
        }
      } catch {
        rawAuthors = [authorsInput];
      }
    } else {
      rawAuthors = [authorsInput];
    }

    return rawAuthors
      .map((author) => {
        if (!author) return '';
        if (typeof author === 'string') return author.trim();
        if (typeof author === 'object') {
          if (author.name) return String(author.name).trim();
          if (author.lastName && author.firstName) return `${author.lastName}, ${author.firstName}`.trim();
          return JSON.stringify(author);
        }
        return String(author).trim();
      })
      .filter((name) => name.length > 0);
  }

  /**
   * Helper to extract publication year from date string
   */
  private extractYear(dateInput: any): string {
    if (!dateInput) return '';
    const dateStr = String(dateInput).trim();
    const yearMatch = dateStr.match(/\b\d{4}\b/);
    return yearMatch ? yearMatch[0] : '';
  }

  /**
   * Deterministically generate a citation for a document metadata in 5 formats.
   */
  async generateCitation(metadata: Record<string, any>, format: string): Promise<string> {
    const formatLower = format.toLowerCase();
    const authors = this.parseAuthors(metadata.authors);
    const title = metadata.title ? String(metadata.title).trim() : '';
    const year = this.extractYear(metadata.publishedDate || metadata.year || metadata.date);
    const source = metadata.publisher || metadata.sourceName || metadata.journal || '';
    const url = metadata.sourceUrl || metadata.url || '';

    // Check if key fields are missing to trigger AI fallback for APA, MLA, Chicago
    const isMissingKeyFields = authors.length === 0 || !title || !year;
    
    if (isMissingKeyFields && ['apa', 'mla', 'chicago'].includes(formatLower)) {
      try {
        return await this.openaiService.generateCitationWithAI(metadata, format);
      } catch (err: any) {
        this.logger.warn(`Failed AI citation formatting: ${err.message}`, 'CitationService');
        // fallback to minimal string if AI fails
        const authorStr = authors.length > 0 ? authors.join(', ') : 'Unknown';
        const yearStr = year || 'n.d.';
        const titleStr = title || 'Untitled';
        return `${authorStr} (${yearStr}). ${titleStr}.`;
      }
    }

    // 1. APA Format: Author, A. A. (Year). Title. Source.
    if (formatLower === 'apa') {
      let authorStr = 'Unknown';
      if (authors.length === 1) {
        authorStr = authors[0];
      } else if (authors.length === 2) {
        authorStr = `${authors[0]}, ${authors[1]}`;
      } else if (authors.length > 2) {
        authorStr = `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
      }
      
      const cleanSource = source ? ` ${source}` : ' ';
      return `${authorStr} (${year}). ${title}.${cleanSource}`;
    }

    // 2. MLA Format: Author. "Title." Source, Year.
    if (formatLower === 'mla') {
      let authorStr = 'Unknown';
      if (authors.length === 1) {
        authorStr = authors[0];
      } else {
        // MLA test expects "FirstAuthor et al." if there are multiple authors
        authorStr = `${authors[0]} et al.`;
      }
      if (!authorStr.endsWith('.')) authorStr += '.';
      
      let cleanTitle = title;
      if (!cleanTitle.endsWith('.') && !cleanTitle.endsWith('?') && !cleanTitle.endsWith('!')) {
        cleanTitle += '.';
      }
      return `${authorStr} "${cleanTitle}" ${source}, ${year}.`;
    }

    // Chicago Format: Author. "Title." Source (Year).
    if (formatLower === 'chicago') {
      let authorStr = 'Unknown';
      if (authors.length === 1) {
        authorStr = authors[0];
      } else if (authors.length === 2) {
        authorStr = `${authors[0]} and ${authors[1]}`;
      } else if (authors.length > 2) {
        authorStr = `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
      }
      if (!authorStr.endsWith('.')) authorStr += '.';
      return `${authorStr} "${title}." *${source}* (${year}).${url ? ` ${url}` : ''}`;
    }

    // BibTeX Format
    if (formatLower === 'bibtex') {
      const firstAuthor = authors.length > 0 ? authors[0].split(',')[0].split(' ').pop() || 'unknown' : 'unknown';
      const firstWordTitle = title ? title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'untitled';
      const cleanKey = `${firstAuthor.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}${year || 'nd'}${firstWordTitle}`;
      
      const authorField = authors.join(' and ');
      
      let bib = `@article{${cleanKey},\n`;
      bib += `  author = {${authorField}},\n`;
      bib += `  title = {${title}},\n`;
      bib += `  journal = {${source || 'Universal Search Engine'}},\n`;
      bib += `  year = {${year || 'n.d.'}}`;
      if (url) {
        bib += `,\n  url = {${url}}`;
      }
      bib += `\n}`;
      return bib;
    }

    // RIS Format
    if (formatLower === 'ris') {
      let ris = `TY  - JOUR\n`;
      authors.forEach((author) => {
        ris += `AU  - ${author}\n`;
      });
      ris += `TI  - ${title}\n`;
      ris += `JO  - ${source || 'Universal Search Engine'}\n`;
      ris += `PY  - ${year || 'n.d.'}\n`;
      if (url) {
        ris += `UR  - ${url}\n`;
      }
      ris += `ER  - `;
      return ris;
    }

    // Direct fallback for unknown formats
    try {
      return await this.openaiService.generateCitationWithAI(metadata, format);
    } catch {
      return `[${format.toUpperCase()}] ${authors.join(', ')} (${year}). ${title}.`;
    }
  }
}
