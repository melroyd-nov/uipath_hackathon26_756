import axios from 'axios';

export interface HealthStatus {
  status: string;
  database: string;
  record_count?: number;
}

export async function getHealth(): Promise<HealthStatus> {
  // /health is unprefixed (not under /api), unlike every other endpoint
  const { data } = await axios.get<HealthStatus>('/health');
  return data;
}
