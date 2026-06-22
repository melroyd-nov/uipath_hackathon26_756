interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="rounded-card-elevated border border-dashed border-silver bg-paper p-8 shadow-card">
      <h1 className="font-editorial text-2xl text-obsidian">{title}</h1>
      <p className="mt-2 text-sm text-slate">
        {description ?? 'Content for this page has not been built yet.'}
      </p>
    </div>
  );
}
