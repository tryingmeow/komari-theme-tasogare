export interface NodeInfo {
  uuid: string;
  name: string;
  cpu_name: string;
  virtualization: string;
  arch: string;
  cpu_cores: number;
  os: string;
  gpu_name: string;
  region: string;
  mem_total: number;
  swap_total: number;
  disk_total: number;
  weight: number;
  price: number;
  billing_cycle: number;
  currency: string;
  expired_at: string | null;
  group: string;
  tags: string;
  hidden: boolean;
  traffic_limit: number;
  traffic_limit_type: string;
}

export interface LatestStatus {
  client: string;
  time: string;
  cpu: number; // percent 0-100
  gpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  load5: number;
  load15: number;
  disk: number;
  disk_total: number;
  net_in: number; // download B/s
  net_out: number; // upload B/s
  net_total_up: number;
  net_total_down: number;
  process: number;
  connections: number;
  connections_udp: number;
  online: boolean;
  uptime: number;
  ping: Record<string, PingStat>;
}

export interface PingStat {
  name: string;
  latest: number;
  avg: number;
  tail: number;
  loss: number;
  min: number;
  max: number;
}

export interface PublicInfo {
  sitename: string;
  description: string;
  theme_settings: Record<string, unknown>;
}

export interface LoadRecord {
  time: string;
  cpu: number;
  ram: number;
  ram_total: number;
  swap: number;
  swap_total: number;
  load: number;
  disk: number;
  disk_total: number;
  net_in: number;
  net_out: number;
  connections: number;
  connections_udp: number;
  process: number;
}

export interface PingTask {
  id: number;
  name: string;
  interval: number;
  loss?: number;
}

export interface PingRecord {
  task_id: number;
  time: string;
  value: number;
}

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  const j = await r.json();
  return (j.data ?? j) as T;
}

export const getPublicInfo = () => getJSON<PublicInfo>("/api/public");
export const getNodes = () => getJSON<NodeInfo[]>("/api/nodes");
export const getRecords = (uuid: string, hours: number) =>
  getJSON<{ count: number; records: LoadRecord[] }>(
    `/api/records/load?uuid=${uuid}&hours=${hours}`,
  );
export const getPingTasks = () => getJSON<PingTask[]>("/api/task/ping");
export const getPingRecords = (uuid: string, hours: number) =>
  getJSON<{ count: number; records: PingRecord[]; tasks?: PingTask[] }>(
    `/api/records/ping?uuid=${uuid}&hours=${hours}`,
  );

let rpcId = 0;
export async function getLatest(): Promise<Record<string, LatestStatus>> {
  const r = await fetch("/api/rpc2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "common:getNodesLatestStatus",
    }),
  });
  if (!r.ok) throw new Error(`rpc2: ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "rpc error");
  return j.result as Record<string, LatestStatus>;
}
