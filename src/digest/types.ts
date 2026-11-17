export type Status = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: Status;
  lastError: string | null;
  first: string; // `at` as written in the log, offset kept
  last: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number;
  counts: Record<Status, number>; // raw log lines per status
};

// Returns null when runs/<night>.jsonl does not exist. Never throws on a bad line.
export type ReadNight = (runsDir: string, night: string) => Night | null;
