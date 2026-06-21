interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">
        {description ?? 'Content for this page has not been built yet.'}
      </p>
    </div>
  );
}
