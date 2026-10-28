import cli from '@/generated/cli.json';
import sizes from '@/generated/sizes.json';
import examples from '@/generated/examples.json';

/*
 * Components backed by apps/docs/generated/*.json, which scripts/docs-sync.mjs
 * builds from the CLI's --help output, lib/sizes.mjs and examples/. The same
 * data fills the README's docs-sync blocks, so the two can't disagree.
 */

type Option = { flags: string | null; description: string; env: string | null; default: string | null };
type Command = {
  command: string;
  usage: string;
  description: string;
  arguments: { name: string; description: string; default: string | null }[];
  options: Option[];
};

function findCommand(command: string): Command {
  const found = (cli as Command[]).find((c) => c.command === command);
  if (!found) throw new Error(`Unknown CLI command "${command}" in generated/cli.json`);
  return found;
}

const dash = <span className="text-fd-muted-foreground">-</span>;

/** Usage line and arguments for one command. */
export function CliUsage({ command }: { command: string }) {
  const cmd = findCommand(command);
  return (
    <>
      <pre className="not-prose overflow-x-auto rounded-xl border bg-fd-card p-4 text-sm">
        <code>open-assets {cmd.usage.replace(/^open-assets\s*/, '')}</code>
      </pre>
      {cmd.arguments.length > 0 && (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Argument</th>
                <th>Default</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {cmd.arguments.map((a) => (
                <tr key={a.name}>
                  <td>
                    <code>{a.name}</code>
                  </td>
                  <td>{a.default ? <code>{a.default}</code> : dash}</td>
                  <td>{a.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Every flag for one command, with its env var and default. */
export function CliOptions({ command }: { command: string }) {
  const cmd = findCommand(command);
  if (cmd.options.length === 0) return <p>This command has no options.</p>;
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Env var</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cmd.options.map((o) => (
            <tr key={o.flags ?? o.env ?? o.description}>
              <td className="whitespace-nowrap">{o.flags ? <code>{o.flags}</code> : dash}</td>
              <td>{o.env ? <code>{o.env}</code> : dash}</td>
              <td>{o.default ? <code>{o.default}</code> : dash}</td>
              <td>{o.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Every command with its one-line description, linking to its page. */
export function CliCommandList() {
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Command</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          {(cli as Command[]).map((c) => (
            <tr key={c.command}>
              <td className="whitespace-nowrap">
                <a href={`/reference/cli/${c.command.split(' ')[0]}`}>
                  <code>open-assets {c.command}</code>
                </a>
              </td>
              <td>{c.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Size = { platform: string; name: string; label: string; width: number; height: number };

/** Common export sizes, optionally filtered to one platform. */
export function ExportSizes({ platform }: { platform?: string }) {
  const rows = (sizes as Size[]).filter((s) => !platform || s.platform === platform);
  return (
    <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            {!platform && <th>Platform</th>}
            <th>Label</th>
            <th>Suggested name</th>
            <th className="text-right">Width</th>
            <th className="text-right">Height</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={`${s.platform}-${s.name}`}>
              {!platform && <td>{s.platform}</td>}
              <td>{s.label}</td>
              <td>
                <code>{s.name}</code>
              </td>
              <td className="text-right tabular-nums">{s.width}</td>
              <td className="text-right tabular-nums">{s.height}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Example = {
  slug: string;
  name: string;
  collections: {
    id: string;
    label: string;
    sourceSize: { width: number; height: number } | null;
    templates: number;
    locales: string[];
    exports: string[];
    outputs: string[];
  }[];
};

const github = 'https://github.com/Parra-Inc/open-assets/tree/main/examples';

/** The rendered screenshot strip and collection breakdown for one example project. */
export function ExampleProject({ slug }: { slug: string }) {
  const ex = (examples as Example[]).find((e) => e.slug === slug);
  if (!ex) throw new Error(`Unknown example "${slug}" in generated/examples.json`);
  return (
    <>
      <figure className="not-prose overflow-x-auto rounded-xl border bg-fd-card p-3">
        <img
          src={`/img/examples/${slug}.webp`}
          alt={`${ex.name} App Store screenshots rendered with Open Assets`}
          className="min-w-[720px] rounded-lg"
          loading="lazy"
        />
      </figure>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Collection</th>
              <th>Source size</th>
              <th>Templates</th>
              <th>Locales</th>
              <th>Exports</th>
            </tr>
          </thead>
          <tbody>
            {ex.collections.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.label} <code>{c.id}</code>
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {c.sourceSize ? `${c.sourceSize.width}×${c.sourceSize.height}` : dash}
                </td>
                <td className="tabular-nums">{c.templates}</td>
                <td>{c.locales.length ? c.locales.join(', ') : dash}</td>
                <td>{[...c.exports, ...c.outputs.map((o) => `${o} output`)].join(', ') || dash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Source: <a href={`${github}/${slug}`}>examples/{slug}</a> on GitHub.
      </p>
    </>
  );
}

/** Cards linking to every example project page. */
export function ExamplesGallery() {
  return (
    <div className="not-prose grid gap-4 sm:grid-cols-2">
      {(examples as Example[]).map((ex) => (
        <a key={ex.slug} href={`/examples/${ex.slug}`} className="group overflow-hidden rounded-xl border bg-fd-card transition hover:border-fd-primary/50">
          <img src={`/img/examples/${ex.slug}.webp`} alt="" className="h-36 w-full object-cover object-left" loading="lazy" />
          <div className="flex items-center gap-3 p-4">
            <img src={`/img/examples/${ex.slug}-icon.png`} alt="" width={32} height={32} className="rounded-lg" />
            <div>
              <p className="font-semibold group-hover:text-fd-primary">{ex.name}</p>
              <p className="text-sm text-fd-muted-foreground">
                {ex.collections.length} collection{ex.collections.length === 1 ? '' : 's'},{' '}
                {ex.collections.reduce((n, c) => n + c.templates, 0)} templates
              </p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
