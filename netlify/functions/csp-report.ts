// Netlify Function: receive and log Content-Security-Policy violation reports (T39).
//
// Browsers send CSP violation reports via two mechanisms:
//   - report-uri (legacy): POST application/csp-report with {"csp-report":{...}}
//   - report-to (modern):  POST application/reports+json with [{type:"csp-violation",...}]
//
// This function accepts both, extracts only non-PII metadata (directive, blocked
// URI, source file, line), and writes it to the function log where platform
// operators can observe violations. No request body contents are reflected back
// and no PII (user identity, full document URL) is retained.

interface LegacyReport {
  'csp-report'?: {
    'violated-directive'?: string;
    'effective-directive'?: string;
    'blocked-uri'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
  };
}

interface ModernReportBody {
  blockedURL?: string;
  effectiveDirective?: string;
  violatedDirective?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface ModernReport {
  type?: string;
  body?: ModernReportBody;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const ct = req.headers.get('content-type') ?? '';

  try {
    const raw = await req.text();
    if (!raw) return new Response(null, { status: 204 });

    if (ct.includes('application/reports+json')) {
      const reports = JSON.parse(raw) as ModernReport[];
      for (const entry of reports) {
        if (entry.type !== 'csp-violation') continue;
        const b = entry.body ?? {};
        console.warn('[csp-report]', {
          directive: b.effectiveDirective ?? b.violatedDirective,
          blocked: b.blockedURL,
          source: b.sourceFile,
          line: b.lineNumber,
        });
      }
    } else {
      const report = (JSON.parse(raw) as LegacyReport)['csp-report'];
      if (report) {
        console.warn('[csp-report]', {
          directive: report['effective-directive'] ?? report['violated-directive'],
          blocked: report['blocked-uri'],
          source: report['source-file'],
          line: report['line-number'],
        });
      }
    }
  } catch {
    // Malformed report body -- ignore.
  }

  return new Response(null, { status: 204 });
};
