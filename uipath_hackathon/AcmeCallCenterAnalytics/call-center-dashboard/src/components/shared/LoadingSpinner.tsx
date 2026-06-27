import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/lottie/loading.json';

export default function LoadingSpinner({ size = 48 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }} role="status" aria-label="Loading">
      <Lottie animationData={loadingAnimation} loop autoplay style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
