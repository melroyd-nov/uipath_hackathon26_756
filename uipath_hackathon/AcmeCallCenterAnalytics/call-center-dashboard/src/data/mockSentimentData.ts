import type { SentimentMonthlyPoint } from '../api/dashboard';
import type { SentimentByAgent } from '../api/analytics';

export const mockSentimentMonthly: SentimentMonthlyPoint[] = [
  { month: 'Jan', avg_score: -0.05, positive_count: 280, neutral_count: 250, negative_count: 190, total_calls: 720 },
  { month: 'Feb', avg_score: 0.02, positive_count: 290, neutral_count: 240, negative_count: 160, total_calls: 690 },
  { month: 'Mar', avg_score: 0.08, positive_count: 340, neutral_count: 250, negative_count: 190, total_calls: 780 },
  { month: 'Apr', avg_score: 0.14, positive_count: 380, neutral_count: 260, negative_count: 170, total_calls: 810 },
  { month: 'May', avg_score: 0.19, positive_count: 430, neutral_count: 270, negative_count: 160, total_calls: 860 },
  { month: 'Jun', avg_score: 0.24, positive_count: 510, neutral_count: 290, negative_count: 160, total_calls: 960 },
];

export const mockSentimentByAgent: SentimentByAgent[] = [
  { agent: 'Priya Nair', total_calls: 312, positive_count: 198, neutral_count: 88, negative_count: 26, negative_pct: 8.3, avg_sentiment: 0.41 },
  { agent: 'Diego Alvarez', total_calls: 289, positive_count: 162, neutral_count: 91, negative_count: 36, negative_pct: 12.5, avg_sentiment: 0.33 },
  { agent: 'Mei Lin', total_calls: 301, positive_count: 150, neutral_count: 105, negative_count: 46, negative_pct: 15.3, avg_sentiment: 0.29 },
  { agent: 'Oluwaseun Bello', total_calls: 264, positive_count: 119, neutral_count: 95, negative_count: 50, negative_pct: 18.9, avg_sentiment: 0.22 },
  { agent: 'Hannah Cohen', total_calls: 245, positive_count: 98, neutral_count: 96, negative_count: 51, negative_pct: 20.8, avg_sentiment: 0.18 },
];
