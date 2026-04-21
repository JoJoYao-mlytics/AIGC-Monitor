import type { BrowserContext, TestInfo } from '@playwright/test';

export interface ApiRecord {
  url: string;
  status: number;
  durationMs: number;
}

export function attachNetworkMonitor(context: BrowserContext, filter: RegExp): ApiRecord[] {
  const records: ApiRecord[] = [];
  const startTimes = new Map<string, number>();

  context.on('request', (request) => {
    if (filter.test(request.url())) {
      startTimes.set(request.url(), Date.now());
    }
  });

  context.on('response', (response) => {
    const url = response.url();
    if (filter.test(url)) {
      const start = startTimes.get(url) ?? Date.now();
      records.push({
        url,
        status: response.status(),
        durationMs: Date.now() - start,
      });
    }
  });

  return records;
}

export function assertApiStatus(
  records: ApiRecord[],
  pattern: RegExp,
  expectedStatus = 200
): void {
  const matched = records.filter((r) => pattern.test(r.url));
  if (matched.length === 0) {
    throw new Error(`API pattern ${pattern} was never called during this test`);
  }
  for (const record of matched) {
    if (record.status !== expectedStatus) {
      throw new Error(
        `API ${record.url} returned ${record.status}, expected ${expectedStatus}`
      );
    }
  }
}

export async function attachNetworkLog(
  records: ApiRecord[],
  testInfo: TestInfo,
  filename = 'network-log.json'
): Promise<void> {
  await testInfo.attach(filename, {
    body: JSON.stringify(records, null, 2),
    contentType: 'application/json',
  });
}
