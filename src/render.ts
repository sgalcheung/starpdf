import { defaultOptions, FORMATS, type InternalRenderOptions } from "./types";
import { resolveDefaults } from "./utils";
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readOutputFile, safeInputFileName } from "./utils/readOutputFile";

export async function render(
  source: string,
  options: InternalRenderOptions,
): Promise<Buffer[]> {
  const {
    format = defaultOptions.format,
    crop = defaultOptions.crop,
    // binaryPath = defaultOptions.binaryPath,
    timeout = defaultOptions.timeout,
    includePaths = [],
    sourceName,
    logger,
  } = options;

  const { resolution } = resolveDefaults(options.defaults);

  if (!FORMATS.includes(format)) {
    throw new Error(`${format} is not a supported format`);
  }

  const dir = await mkdtemp(join(tmpdir(), 'astro-pdf-'));
  const inputPath = join(dir, safeInputFileName(sourceName));
  const outputBase = join(dir, 'output');
  // no svg output found in /var/folders/8g/5n26b_x56jj564fbg3g0529c0000gn/T/astro-lilypond-G0Tvd4
  // debug: 阅读源码逻辑

  console.log(source)
  try {
    await writeFile(inputPath, source, 'utf8');

    // await execLilyPond({
    //   binaryPath,
    //   format,
    //   crop,
    //   resolution,
    //   includePaths,
    //   timeout,
    //   inputPath,
    //   outputBase,
    //   logger,
    // });

    return await readOutputFile(outputBase, format, crop);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
