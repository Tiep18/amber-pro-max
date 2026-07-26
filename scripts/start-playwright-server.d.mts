import type {ChildProcess} from 'node:child_process';

export function nextBuildDirectory(projectRoot: string): string;
export function cleanPlaywrightBuildArtifacts(projectRoot: string): Promise<void>;
export function startPlaywrightServer(options?: {
  projectRoot?: string;
  port?: string | number;
}): Promise<ChildProcess>;
