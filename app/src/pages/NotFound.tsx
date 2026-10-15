import { Button } from '../components/Button';
import { RevealText } from '../components/Reveal';
import { Arrow } from '../components/Icons';

export default function NotFound() {
  return (
    <section className="container not-found">
      <p className="eyebrow">404</p>
      <RevealText as="h1" className="display" lines={['Out of frame.']} immediate />
      <p className="lead">The page you're looking for has moved or never existed.</p>
      <Button to="/" icon={<Arrow />}>Back to home</Button>
    </section>
  );
}
