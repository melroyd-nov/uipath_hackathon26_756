import { useParams } from 'react-router-dom';
import PlaceholderPage from '../components/PlaceholderPage';

export default function CallDetailPage() {
  const { id } = useParams();
  return <PlaceholderPage title={`Call Detail: ${id}`} description="Single call record and its follow-ups." />;
}
