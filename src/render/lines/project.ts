import type { RenderContext } from '../../types.js';
import { getModelName, getProviderLabel } from '../../stdin.js';
import { brightBlue, cyan, magenta, yellow, red } from '../colors.js';

export function renderProjectLine(ctx: RenderContext): string | null {
  const display = ctx.config?.display;
  const parts: string[] = [];

  if (display?.showModel !== false) {
    const model = getModelName(ctx.stdin);
    const providerLabel = getProviderLabel(ctx.stdin);
    const planName = display?.showUsage !== false ? ctx.usageData?.planName : undefined;
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    const billingLabel = hasApiKey ? red('API') : planName;
    const planDisplay = providerLabel ?? billingLabel;
    const modelDisplay = planDisplay ? `${model} | ${planDisplay}` : model;
    parts.push(cyan(`[${modelDisplay}]`));
  }

  if (ctx.stdin.cwd) {
    const segments = ctx.stdin.cwd.split(/[/\\]/).filter(Boolean);
    const pathLevels = ctx.config?.pathLevels ?? 1;
    const projectPath = segments.length > 0 ? segments.slice(-pathLevels).join('/') : '/';

    let gitPart = '';
    const gitConfig = ctx.config?.gitStatus;
    const showGit = gitConfig?.enabled ?? true;

    if (showGit && ctx.gitStatus) {
      const branchParts: string[] = [ctx.gitStatus.branch];

      if ((gitConfig?.showDirty ?? true) && ctx.gitStatus.isDirty) {
        branchParts.push('*');
      }

      gitPart = ` ${magenta('git:(')}${cyan(branchParts.join(''))}${magenta(')')}`;

      // ↑↓ ahead/behind OUTSIDE parentheses
      if (gitConfig?.showAheadBehind) {
        const abParts: string[] = [];
        if (ctx.gitStatus.ahead > 0) abParts.push(`↑${ctx.gitStatus.ahead}`);
        if (ctx.gitStatus.behind > 0) abParts.push(`↓${ctx.gitStatus.behind}`);
        if (abParts.length > 0) gitPart += ` ${cyan(abParts.join(' '))}`;
      }

      if (gitConfig?.showFileStats && ctx.gitStatus.fileStats) {
        const { modified, added, deleted, untracked } = ctx.gitStatus.fileStats;
        const statParts: string[] = [];
        if (modified > 0) statParts.push(`!${modified}`);
        if (added > 0) statParts.push(`+${added}`);
        if (deleted > 0) statParts.push(`✘${deleted}`);
        if (untracked > 0) statParts.push(`?${untracked}`);
        if (statParts.length > 0) gitPart += ` ${statParts.join(' ')}`;
      }
    }

    let sessionPart = '';
    if (ctx.transcript.sessionName) {
      sessionPart = ` ${brightBlue(`[${ctx.transcript.sessionName}]`)}`;
    }
    parts.push(`${yellow(projectPath)}${gitPart}${sessionPart}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' \u2502 ');
}
