import { Helmet } from 'react-helmet-async';

export default function JsonLd({ blocks }) {
  if (!blocks?.length) return null;
  return (
    <Helmet>
      {blocks.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
