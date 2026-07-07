// keyword → bundled logo (assets copied from official komari-web)
const OS_ICONS: [string[], string][] = [
  [["alma"], "os-alma.svg"],
  [["alpine"], "os-alpine.webp"],
  [["aosc"], "os-aosc.svg"],
  [["armbian"], "os-armbian.svg"],
  [["centos"], "os-centos.svg"],
  [["debian"], "os-debian.svg"],
  [["freebsd", "bsd"], "os-freebsd.svg"],
  [["ubuntu", "elementary"], "os-ubuntu.svg"],
  [["windows", "microsoft"], "os-windows.svg"],
  [["arch"], "os-arch.svg"],
  [["kali", "kail"], "os-kail.svg"],
  [["istore"], "os-istore.png"],
  [["openwrt", "immortalwrt", "qwrt"], "os-openwrt.svg"],
  [["nixos", "nix"], "os-nix.svg"],
  [["rocky"], "os-rocky.svg"],
  [["fedora"], "os-fedora.svg"],
  [["opensuse", "suse"], "os-openSUSE.svg"],
  [["gentoo"], "os-gentoo.svg"],
  [["redhat", "rhel", "red hat"], "os-redhat.svg"],
  [["mint"], "os-mint.svg"],
  [["manjaro"], "os-manjaro-.svg"],
  [["synology", "dsm"], "os-synology.ico"],
  [["fnos", "fnnas"], "os-fnos.ico"],
  [["proxmox"], "os-proxmox.ico"],
  [["macos"], "os-macos.svg"],
  [["qts", "quts"], "os-qnap.svg"],
  [["astra"], "os-astar.png"],
  [["orange pi", "orangepi"], "os-orange-pi.svg"],
  [["huawei", "euler"], "os-huawei.svg"],
  [["aliyun", "alibaba"], "alibabacloud-color.svg"],
  [["opencloud"], "os-OpenCloudOS.png"],
  [["unraid"], "os-unraid.svg"],
];

export function osIcon(os: string): string {
  const s = (os || "").toLowerCase();
  for (const [keys, file] of OS_ICONS) {
    if (keys.some((k) => s.includes(k))) return `/assets/logo/${file}`;
  }
  return "/assets/logo/linux.svg";
}
