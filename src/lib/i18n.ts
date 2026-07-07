const zh = {
  online: "在线",
  offline: "离线",
  day: "天",
  hour: "时",
  min: "分",
  cpu: "CPU",
  ram: "内存",
  disk: "硬盘",
  swap: "SWAP",
  load: "负载",
  uptime: "在线",
  traffic: "流量",
  search: "搜索节点名称、地区、系统…",
  all: "全部",
  currentTime: "当前时间",
  currentOnline: "当前在线",
  regions: "地区",
  totalTraffic: "总流量",
  netSpeed: "实时网速",
  nodes: "个节点",
  latency: "延迟",
  noPingTasks: "未配置延迟监控任务",
  netChart: "网速",
  connections: "连接数",
  processes: "进程",
  virtualization: "虚拟化",
  arch: "架构",
  system: "系统",
  expire: "到期",
  longterm: "长期",
  loss: "丢包",
  loading: "加载中… (っ˘ω˘ς)",
  offline_hint: "节点离线 (˘ω˘) zzZ",
  upload: "上行",
  download: "下行",
  tcp: "TCP",
  udp: "UDP",
  price: "价格",
  expired: "已到期",
  empty: "没有找到符合条件的节点 (´･ω･`)",
  free: "免费",
};

const en: typeof zh = {
  online: "Online",
  offline: "Offline",
  day: "d",
  hour: "h",
  min: "m",
  cpu: "CPU",
  ram: "RAM",
  disk: "Disk",
  swap: "SWAP",
  load: "Load",
  uptime: "Up",
  traffic: "Traffic",
  search: "Search name, region, OS…",
  all: "All",
  currentTime: "Time",
  currentOnline: "Online",
  regions: "Regions",
  totalTraffic: "Total Traffic",
  netSpeed: "Speed",
  nodes: "nodes",
  latency: "Latency",
  noPingTasks: "No ping tasks configured",
  netChart: "Network",
  connections: "Connections",
  processes: "Procs",
  virtualization: "Virt",
  arch: "Arch",
  system: "OS",
  expire: "Expires",
  longterm: "Long-term",
  loss: "Loss",
  loading: "Loading… (っ˘ω˘ς)",
  offline_hint: "Node offline (˘ω˘) zzZ",
  upload: "Up",
  download: "Down",
  tcp: "TCP",
  udp: "UDP",
  price: "Price",
  expired: "Expired",
  empty: "No matching nodes (´･ω･`)",
  free: "Free",
};

const isZh =
  typeof navigator !== "undefined" &&
  (navigator.language || "").toLowerCase().startsWith("zh");

export const t = (k: keyof typeof zh): string => (isZh ? zh[k] : en[k]);

// "剩 12 天" / "12d left" — word order differs, so compose here
export const fmtDaysLeft = (d: number): string => (isZh ? `剩 ${d} 天` : `${d}d left`);

// billing cycle in days → human label
export const fmtCycle = (days: number): string => {
  if (days >= 360 && days <= 370) return isZh ? "年" : "yr";
  if (days >= 88 && days <= 92) return isZh ? "季" : "qtr";
  if (days >= 28 && days <= 31) return isZh ? "月" : "mo";
  return isZh ? `${days} 天` : `${days}d`;
};
