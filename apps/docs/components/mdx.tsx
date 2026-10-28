import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import type { MDXComponents } from 'mdx/types';
import {
  CliCommandList,
  CliOptions,
  CliUsage,
  ExampleProject,
  ExamplesGallery,
  ExportSizes,
} from './generated';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Step,
    Steps,
    File,
    Files,
    Folder,
    Accordion,
    Accordions,
    TypeTable,
    img: (props) => <ImageZoom {...(props as any)} />,
    CliCommandList,
    CliOptions,
    CliUsage,
    ExampleProject,
    ExamplesGallery,
    ExportSizes,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
