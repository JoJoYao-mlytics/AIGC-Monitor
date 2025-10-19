import type { Reporter, FullConfig, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import * as https from 'https';

function postToSlack(webhookUrl: string, payload: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      // Consume response
      res.on('data', () => {});
      res.on('end', () => resolve());
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

class SlackReporter implements Reporter {
  private webhook?: string;
  private enabled: boolean = false;
  private startedAtMs: number = Date.now();
  private total: number = 0;
  private passed: number = 0;
  private failed: number = 0;
  private skipped: number = 0;
  private flaky: number = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.webhook = process.env.SLACK_WEBHOOK_URL;
    const flag = (process.env.SLACK_ENABLE || '').toLowerCase();
    this.enabled = flag === '1' || flag === 'true' || !!this.webhook; // enable if explicitly set or webhook provided
    this.startedAtMs = Date.now();
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    // accumulate stats
    this.total += 1;
    if (result.status === 'passed') this.passed += 1;
    else if (result.status === 'skipped') this.skipped += 1;
    else this.failed += 1;
    if (result.retry > 0 && result.status === 'passed') this.flaky += 1;

    if (!this.webhook || !this.enabled) return;
    if (result.status === 'failed') {
      const title = `${test.parent?.title ? test.parent.title + ' › ' : ''}${test.title}`;
      const failure = result.error;
      const message = {
        text: `❌ Playwright Test Failed`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '❌ Playwright Test Failed' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Test*: ${title}` } },
          failure?.message ? { type: 'section', text: { type: 'mrkdwn', text: `*Message*: ${failure.message}` } } : undefined,
          failure?.stack ? { type: 'section', text: { type: 'mrkdwn', text: `*Stack*:\n\`\`\`${failure.stack}\`\`\`` } } : undefined,
        ].filter(Boolean),
      };
      try {
        await postToSlack(this.webhook, message);
      } catch {
        // ignore slack errors to not affect test run
      }
    }
  }

  async onEnd() {
    if (!this.webhook || !this.enabled) return;
    const durationSec = Math.max(1, Math.round((Date.now() - this.startedAtMs) / 1000));
    const statusText = this.failed === 0 ? '✅ All Passed' : '⚠️ Completed with Failures';
    const reportUrl = process.env.PLAYWRIGHT_REPORT_URL; // optional CI artifact URL
    const reportDir = process.env.PLAYWRIGHT_REPORT_DIR || 'playwright-report';

    const lines = [
      `• Total: ${this.total}`,
      `• Passed: ${this.passed}`,
      `• Failed: ${this.failed}`,
      `• Skipped: ${this.skipped}`,
      `• Flaky (passed after retry): ${this.flaky}`,
      `• Duration: ${durationSec}s`,
    ];

    const blocks: any[] = [
      { type: 'header', text: { type: 'plain_text', text: `Playwright E2E Summary` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*Status*: ${statusText}` } },
      { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') } },
    ];

    if (reportUrl) {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Report*: ${reportUrl}` } });
    } else {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Report directory*: \`${reportDir}\`` } });
    }

    const summary = { text: 'Playwright E2E Summary', blocks };
    try {
      await postToSlack(this.webhook, summary);
    } catch {
      // ignore slack errors to not affect test run
    }
  }
}

export default SlackReporter;


