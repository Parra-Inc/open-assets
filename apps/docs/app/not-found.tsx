import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-sm text-fd-primary">404</p>
      <h1 className="text-3xl font-bold">This page was never rendered.</h1>
      <p className="text-fd-muted-foreground">It may have moved. Try search, or start from the docs home.</p>
      <Link href="/" className="rounded-lg bg-fd-primary px-4 py-2 font-medium text-fd-primary-foreground">
        Docs home
      </Link>
    </main>
  );
}
