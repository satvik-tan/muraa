type BrandKey = "mura" | "cognihire";

type BrandConfig = {
  key: BrandKey;
  appName: string;
  appNameWithSuffix: string;
  description: string;
};

const BRAND_CONFIG: Record<BrandKey, BrandConfig> = {
  mura: {
    key: "mura",
    appName: "Mura",
    appNameWithSuffix: "Mura AI",
    description: "AI Interview Assistant",
  },
  cognihire: {
    key: "cognihire",
    appName: "Cognihire",
    appNameWithSuffix: "Cognihire AI",
    description: "Lilac-powered AI interviewing for modern hiring teams",
  },
};

export function getBrandConfig(): BrandConfig {
  const raw = (process.env.NEXT_PUBLIC_BRAND ?? "cognihire").trim().toLowerCase();
  const key: BrandKey = raw === "mura" ? "mura" : "cognihire";
  return BRAND_CONFIG[key];
}
