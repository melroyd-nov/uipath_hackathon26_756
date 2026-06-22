import type { MarketingOpportunity } from '../api/analytics';

export const mockMarketingOpportunities: MarketingOpportunity[] = [
  { intent: 'Product Upgrade Inquiry', opportunity_type: 'Upsell', call_count: 312, positive_sentiment_pct: 78.2, avg_sentiment: 0.62, conversion_score: 84 },
  { intent: 'New Product Interest', opportunity_type: 'Cross-sell', call_count: 245, positive_sentiment_pct: 82.3, avg_sentiment: 0.71, conversion_score: 89 },
  { intent: 'Service Tier Question', opportunity_type: 'Upsell', call_count: 198, positive_sentiment_pct: 71.4, avg_sentiment: 0.48, conversion_score: 76 },
  { intent: 'Referral Program Question', opportunity_type: 'Referral', call_count: 176, positive_sentiment_pct: 88.1, avg_sentiment: 0.79, conversion_score: 92 },
  { intent: 'Loyalty Reward Inquiry', opportunity_type: 'Retention', call_count: 143, positive_sentiment_pct: 65.9, avg_sentiment: 0.31, conversion_score: 61 },
  { intent: 'Bundle Pricing Question', opportunity_type: 'Cross-sell', call_count: 121, positive_sentiment_pct: 74.6, avg_sentiment: 0.55, conversion_score: 71 },
  { intent: 'Premium Feature Inquiry', opportunity_type: 'Upsell', call_count: 97, positive_sentiment_pct: 69.0, avg_sentiment: 0.42, conversion_score: 68 },
  { intent: 'Renewal Intent', opportunity_type: 'Retention', call_count: 84, positive_sentiment_pct: 58.8, avg_sentiment: 0.18, conversion_score: 54 },
  { intent: 'Add-on Service Inquiry', opportunity_type: 'Cross-sell', call_count: 72, positive_sentiment_pct: 76.2, avg_sentiment: 0.59, conversion_score: 73 },
  { intent: 'Discount / Promotion Query', opportunity_type: 'Retention', call_count: 61, positive_sentiment_pct: 52.3, avg_sentiment: 0.09, conversion_score: 47 },
];
