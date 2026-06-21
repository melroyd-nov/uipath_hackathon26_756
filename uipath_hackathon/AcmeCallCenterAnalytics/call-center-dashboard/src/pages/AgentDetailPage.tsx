import { useParams } from 'react-router-dom';
import PlaceholderPage from '../components/PlaceholderPage';

export default function AgentDetailPage() {
  const { name } = useParams();
  return <PlaceholderPage title={`Agent: ${name}`} description="Agent aggregation and recent calls." />;
}
