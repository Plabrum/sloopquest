import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const TEMPLATES_DIR = path.join(__dirname, '../templates');
const OUTPUT_DIR = path.join(__dirname, '../out/pdfs');
const TEMP_DIR = path.join(__dirname, '../.tmp');

function extractPropsFromTemplate(templatePath: string): string[] {
  const sourceCode = fs.readFileSync(templatePath, 'utf-8');
  const sourceFile = ts.createSourceFile(templatePath, sourceCode, ts.ScriptTarget.Latest, true);

  const propNames: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isInterfaceDeclaration(node) && node.name.text.endsWith('Props')) {
      node.members.forEach((member) => {
        if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
          propNames.push(member.name.text);
        }
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return propNames;
}

function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function generateEntryFile(templateName: string, templatePath: string): string {
  return `
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import Template from '${templatePath.replace(/\\/g, '/')}';

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const data = JSON.parse(Buffer.concat(chunks).toString());
  const buffer = await renderToBuffer(React.createElement(Template, data));
  process.stdout.write(buffer);
}
main().catch(e => { process.stderr.write(String(e)); process.exit(1); });
`.trim();
}

async function buildTemplate(templateName: string) {
  console.log(`Building ${templateName}...`);

  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.tsx`);
  const dirName = toSnakeCase(templateName);
  const outputDir = path.join(OUTPUT_DIR, dirName);
  const outputFile = path.join(outputDir, 'render.js');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const entryContent = generateEntryFile(templateName, templatePath);
  const entryFile = path.join(TEMP_DIR, `${templateName}.entry.ts`);
  fs.writeFileSync(entryFile, entryContent, 'utf-8');

  try {
    await esbuild.build({
      entryPoints: [entryFile],
      bundle: true,
      platform: 'node',
      jsx: 'automatic',
      outfile: outputFile,
      format: 'cjs',
      external: [],
    });

    const props = extractPropsFromTemplate(templatePath);
    console.log(`✓ Built ${templateName}:`);
    console.log(`  Props: ${props.join(', ') || '(none)'}`);
    console.log(`  Output: ${outputFile}`);
  } finally {
    fs.rmSync(entryFile, { force: true });
  }
}

async function buildAll() {
  console.log('Building all PDF templates...\n');

  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TEMPLATES_DIR);
  const templateFiles = files.filter(
    (file) => file.endsWith('.tsx') && !file.startsWith('_') && file !== 'components.tsx'
  );

  if (templateFiles.length === 0) {
    console.log('No template files found.');
    return;
  }

  for (const file of templateFiles) {
    await buildTemplate(file.replace('.tsx', ''));
  }

  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  console.log(`\n✓ Successfully built ${templateFiles.length} template(s)`);
}

buildAll();
