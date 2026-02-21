import type { RenderContext, UsageData } from '../../types.js';
import { isLimitReached } from '../../types.js';
import { getContextPercent, getBufferedPercent, getProviderLabel } from '../../stdin.js';
import { dim, cyan, green, red, yellow, getContextColor, RESET } from '../colors.js';

const SEP = dim('|');

/**
 * Unified status line (OMC-style compact):
 * ctx:25%|5h:41%(3h14m) wk:11%(5d17h)|1 CLAUDE.md|v2.1.50|+15 -3|skill:write-spec
 */
export function renderStatusLine(ctx: RenderContext): string | null {
  const parts: string[] = [];

  // 1) ctx:XX% (OMC-style compact, no bar)
  const rawPercent = getContextPercent(ctx.stdin);
  const bufferedPercent = getBufferedPercent(ctx.stdin);
  const autocompactMode = ctx.config?.display?.autocompactBuffer ?? 'enabled';
  const percent = autocompactMode === 'disabled' ? rawPercent : bufferedPercent;
  parts.push(renderCompactContext(percent));

  // 2) 5h:XX%(XhXm) wk:XX%(XdXh) (OMC-style usage, same color as ctx)
  const display = ctx.config?.display;
  if (display?.showUsage !== false && ctx.usageData?.planName && !getProviderLabel(ctx.stdin)) {
    const usagePart = renderCompactUsage(ctx.usageData);
    if (usagePart) parts.push(usagePart);
  }

  // 3) N CLAUDE.md
  if (display?.showConfigCounts !== false && ctx.claudeMdCount > 0) {
    parts.push(dim(`${ctx.claudeMdCount} CLAUDE.md`));
  }

  // 4) vX.X.X
  if (ctx.cliVersion) {
    parts.push(dim(`v${ctx.cliVersion}`));
  }

  // 5) +N -N (line diff)
  if (ctx.gitStatus?.lineDiff) {
    const { additions, deletions } = ctx.gitStatus.lineDiff;
    const diffParts: string[] = [];
    if (additions > 0) diffParts.push(green(`+${additions}`));
    if (deletions > 0) diffParts.push(red(`-${deletions}`));
    if (diffParts.length > 0) parts.push(diffParts.join(' '));
  }

  // 6) skill label
  if (ctx.extraLabel) {
    parts.push(cyan(ctx.extraLabel));
  }

  if (parts.length === 0) return null;

  return parts.join(` ${SEP} `);
}

function renderCompactContext(percent: number): string {
  const color = getContextColor(percent);
  const label = `ctx:${percent}%`;

  if (percent >= 85) {
    return `${color}${label} CRITICAL${RESET}`;
  }
  if (percent >= 80) {
    return `${color}${label} COMPRESS?${RESET}`;
  }
  return `${color}${label}${RESET}`;
}

function renderCompactUsage(data: UsageData): string | null {
  if (data.apiUnavailable) {
    return yellow('usage:??');
  }

  if (isLimitReached(data)) {
    const resetTime = data.fiveHour === 100
      ? formatResetTime(data.fiveHourResetAt)
      : formatResetTime(data.sevenDayResetAt);
    return red(`LIMIT${resetTime ? `(${resetTime})` : ''}`);
  }

  const parts: string[] = [];

  // 5h usage — uses getContextColor (same as OMC: GREEN <70, YELLOW 70-84, RED >=85)
  if (data.fiveHour !== null) {
    const color = getContextColor(data.fiveHour);
    const reset = formatResetTime(data.fiveHourResetAt);
    const resetPart = reset ? `(${reset})` : '';
    parts.push(`${color}5h:${data.fiveHour}%${resetPart}${RESET}`);
  }

  // Weekly usage — same color scheme as OMC
  if (data.sevenDay !== null) {
    const color = getContextColor(data.sevenDay);
    const reset = formatResetTime(data.sevenDayResetAt);
    const resetPart = reset ? `(${reset})` : '';
    parts.push(`${color}wk:${data.sevenDay}%${resetPart}${RESET}`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

function formatResetTime(resetAt: Date | null): string {
  if (!resetAt) return '';
  const now = new Date();
  const diffMs = resetAt.getTime() - now.getTime();
  if (diffMs <= 0) return '';

  const diffMins = Math.ceil(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours > 0) return `${days}d${remHours}h`;
    return `${days}d`;
  }

  return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
}
