export interface SiteConfig {
  name: string;
  displayName: string;

  // 入口
  articleListUrl: string;
  articleLinkPattern: string;

  // Widget
  widgetHeadingText: RegExp;
  questionLinkPattern: string;

  // 答案頁
  answerUrlPattern: RegExp;
  usesIframe: boolean;
  iframePattern?: string;

  // 答案頁內容區塊 selector
  answerContentSelector: string;
  dataSourceSelector: string;
  relatedQuestionsSelector: string;

  // 串流完成信號（可選）
  loadingIndicatorSelector?: string;

  // 要斷言 status=200 的 API URL patterns
  apiUrlPatterns: RegExp[];
}

export const SITE_CONFIGS: SiteConfig[] = [
  {
    name: 'gvm',
    displayName: '遠見雜誌 (GVM)',
    articleListUrl: 'https://www.gvm.com.tw/list/all',
    articleLinkPattern: 'a[href*="/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道|想要深入知道嗎/,
    questionLinkPattern: 'a.question-link',
    answerUrlPattern: /aigc\.gvm\.com\.tw\/answer\//,
    usesIframe: true,
    iframePattern: 'iframe[src*="aigc.gvm.com.tw"]',
    answerContentSelector: '#answer_area',
    dataSourceSelector: '#article_area',
    relatedQuestionsSelector: '#aigc-also-ask',
    loadingIndicatorSelector: '.loading-text',
    apiUrlPatterns: [/questions_ajax/, /answer_html/],
  },
  {
    name: 'bnext',
    displayName: '數位時代 (bnext)',
    articleListUrl: 'https://www.bnext.com.tw/articles',
    articleLinkPattern: 'a[href*="/articles/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="ai.bnext.com.tw/answer"]',
    answerUrlPattern: /ai\.bnext\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'cmoney',
    displayName: 'CMoney',
    articleListUrl: 'https://www.cmoney.tw/notes/?navId=twstock_news',
    articleLinkPattern: 'a[href*="/notes/note-detail.aspx"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc"]',
    answerUrlPattern: /aigc.*cmoney\.tw|cmoney\.tw.*aigc/,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: '#source_area',
    relatedQuestionsSelector: '#question_area',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'cnyes',
    displayName: '鉅亨網 (cnyes)',
    articleListUrl: 'https://news.cnyes.com/news/cat/headline',
    articleLinkPattern: 'a[href^="/news/id/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="/news/aigc/answer"], a[href*="aigc.cnyes.com/answer"]',
    answerUrlPattern: /news\.cnyes\.com\/news\/aigc\/answer|aigc\.cnyes\.com\/answer/,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar',
    displayName: 'U-CAR 試車',
    articleListUrl: 'https://roadtest.u-car.com.tw/roadtest/articles',
    articleLinkPattern: 'a[href*="/roadtest/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-am',
    displayName: 'U-CAR AM',
    articleListUrl: 'https://am.u-car.com.tw/am',
    articleLinkPattern: 'a[href*="/am/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-motor',
    displayName: 'U-CAR Motor',
    articleListUrl: 'https://motor.u-car.com.tw/motor/articles',
    articleLinkPattern: 'a[href*="/motor/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
  {
    name: 'ucar-news',
    displayName: 'U-CAR News',
    articleListUrl: 'https://news.u-car.com.tw/news/articles',
    articleLinkPattern: 'main a[href*="/news/article/"]',
    widgetHeadingText: /你想知道哪些|AI來解答|你可能想知道/,
    questionLinkPattern: 'a[href*="aigc.u-car.com.tw/answer"]',
    answerUrlPattern: /aigc\.u-car\.com\.tw\/answer\//,
    usesIframe: false,
    answerContentSelector: 'p, li',
    dataSourceSelector: 'h2:has-text("資料來源"), h3:has-text("資料來源")',
    relatedQuestionsSelector: 'h2:has-text("你想知道"), h3:has-text("你想知道")',
    apiUrlPatterns: [/questions_ajax/],
  },
];
