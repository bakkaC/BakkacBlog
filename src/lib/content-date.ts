const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const SHANGHAI_OFFSET = '+08:00';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/;
const HAS_TIMEZONE_RE = /(Z|[+-]\d{2}:\d{2})$/i;

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatUtcDateParts = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = pad2(value.getUTCMonth() + 1);
  const day = pad2(value.getUTCDate());
  const hours = pad2(value.getUTCHours());
  const minutes = pad2(value.getUTCMinutes());
  const seconds = pad2(value.getUTCSeconds());
  const milliseconds = value.getUTCMilliseconds();

  if (hours === '00' && minutes === '00' && seconds === '00' && milliseconds === 0) {
    return `${year}-${month}-${day}`;
  }

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const normalizeContentDate = (value?: unknown): string | undefined => {
  if (value == null) return undefined;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return formatUtcDateParts(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }

  return undefined;
};

const withShanghaiOffset = (value: string) => {
  if (DATE_ONLY_RE.test(value)) {
    return `${value}T00:00:00${SHANGHAI_OFFSET}`;
  }

  const localMatch = value.match(LOCAL_DATETIME_RE);
  if (localMatch) {
    const [, datePart, timePart, secondsPart] = localMatch;
    const normalizedSeconds = secondsPart ?? '00';
    return `${datePart}T${timePart}:${normalizedSeconds}${SHANGHAI_OFFSET}`;
  }

  return value;
};

export const parseContentDate = (value?: string | Date): Date | undefined => {
  const normalized = normalizeContentDate(value);
  if (!normalized) return undefined;

  const candidate = HAS_TIMEZONE_RE.test(normalized)
    ? normalized
    : withShanghaiOffset(normalized);
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export const getContentDateTimestamp = (value?: string | Date) => parseContentDate(value)?.getTime() ?? 0;

export const formatContentDate = (value?: string | Date) => {
  const parsed = parseContentDate(value);
  if (!parsed) return '';

  return new Intl.DateTimeFormat('zh-Hans', {
    timeZone: SHANGHAI_TIME_ZONE,
  }).format(parsed);
};

export const formatSchemaDate = (value?: string | Date) => {
  const normalized = normalizeContentDate(value);
  if (!normalized) return undefined;

  if (DATE_ONLY_RE.test(normalized)) {
    return normalized;
  }

  if (LOCAL_DATETIME_RE.test(normalized)) {
    return withShanghaiOffset(normalized);
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};
