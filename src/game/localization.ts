import { GLOBAL_TRANSLATION_EXTENSIONS } from "./localizationPacks";

export const DEFAULT_LANGUAGE = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", appStoreLocale: "en-US", name: "English", nativeName: "English" },
  {
    code: "zh-Hans",
    appStoreLocale: "zh-Hans",
    name: "Chinese Simplified",
    nativeName: "简体中文",
  },
  { code: "es", appStoreLocale: "es-ES", name: "Spanish", nativeName: "Español" },
  { code: "hi", appStoreLocale: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ar", appStoreLocale: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
  {
    code: "pt-BR",
    appStoreLocale: "pt-BR",
    name: "Portuguese Brazil",
    nativeName: "Português (Brasil)",
  },
  { code: "fr", appStoreLocale: "fr-FR", name: "French", nativeName: "Français" },
  { code: "de", appStoreLocale: "de-DE", name: "German", nativeName: "Deutsch" },
  { code: "ja", appStoreLocale: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", appStoreLocale: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ru", appStoreLocale: "ru", name: "Russian", nativeName: "Русский" },
  { code: "id", appStoreLocale: "id", name: "Indonesian", nativeName: "Bahasa Indonesia" },
  { code: "tr", appStoreLocale: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "it", appStoreLocale: "it", name: "Italian", nativeName: "Italiano" },
  { code: "vi", appStoreLocale: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

type TranslationMap = Record<string, string>;

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return (
    typeof value === "string" && SUPPORTED_LANGUAGES.some((language) => language.code === value)
  );
}

export function normalizeLanguage(value: unknown): AppLanguage {
  return isSupportedLanguage(value) ? value : DEFAULT_LANGUAGE;
}

export function getLanguageDirection(language: AppLanguage): "ltr" | "rtl" {
  const entry = SUPPORTED_LANGUAGES.find((candidate) => candidate.code === language);
  return entry && "dir" in entry && entry.dir === "rtl" ? "rtl" : "ltr";
}

export function toIntlLocale(language: AppLanguage): string {
  return SUPPORTED_LANGUAGES.find((entry) => entry.code === language)?.appStoreLocale ?? "en-US";
}

export function translateText(text: string, language: AppLanguage): string {
  if (language === DEFAULT_LANGUAGE) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  const translated = translateTrimmed(trimmed, language);
  if (!translated || translated === trimmed) return text;

  const leading = text.match(/^\s*/)?.[0] ?? "";
  const trailing = text.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

export function t(text: string, language: AppLanguage): string {
  return translateTrimmed(text, language) ?? text;
}

function translateTrimmed(text: string, language: AppLanguage): string | undefined {
  const dictionary = TRANSLATIONS[language];
  if (!dictionary) return undefined;
  if (dictionary[text]) return dictionary[text];
  const source = text.replace(/\s+/g, " ");
  if (source !== text && dictionary[source]) return dictionary[source];

  const arrowPrefix = /^([←→]) (.+)$/.exec(source);
  if (arrowPrefix) {
    const label = translateTrimmed(arrowPrefix[2], language) ?? arrowPrefix[2];
    return `${arrowPrefix[1]} ${label}`;
  }

  const simpleLevel = /^Level (\d+)$/.exec(source);
  if (simpleLevel) {
    return `${dictionary.Level ?? "Level"} ${simpleLevel[1]}`;
  }

  const levelOf = /^Level (\d+) of (\d+)$/.exec(source);
  if (levelOf) {
    return `${dictionary.Level ?? "Level"} ${levelOf[1]} ${dictionary.of ?? "of"} ${levelOf[2]}`;
  }

  const levelSlash = /^Level (\d+) \/ (\d+)$/.exec(source);
  if (levelSlash) {
    return `${dictionary.Level ?? "Level"} ${levelSlash[1]} / ${levelSlash[2]}`;
  }

  const levelRequirement = /^Level (\d+) \/ (.+)$/.exec(source);
  if (levelRequirement) {
    const requirement =
      translateTrimmed(levelRequirement[2], language) ?? levelRequirement[2];
    return `${dictionary.Level ?? "Level"} ${levelRequirement[1]} / ${requirement}`;
  }

  const modeLevelLabel = /^(Boss|Challenge) • Level (\d+)$/.exec(source);
  if (modeLevelLabel) {
    const kind = dictionary[modeLevelLabel[1]] ?? modeLevelLabel[1];
    return `${kind} • ${dictionary.Level ?? "Level"} ${modeLevelLabel[2]}`;
  }

  const quests = /^(\d+)\/(\d+) quests complete today\.$/.exec(source);
  if (quests) {
    return `${quests[1]}/${quests[2]} ${dictionary["quests complete today."] ?? "quests complete today."}`;
  }

  const dailyQuestCount = /^Streak (\d+) - (\d+)\/(\d+) quests$/.exec(source);
  if (dailyQuestCount) {
    return `${dictionary.Streak ?? "Streak"} ${dailyQuestCount[1]} - ${dailyQuestCount[2]}/${dailyQuestCount[3]} ${dictionary.quests ?? "quests"}`;
  }

  const dailyPrize = /^Complete 4 of 6 quests to claim the daily prize of (\d+) gold coins\.$/.exec(
    source,
  );
  if (dailyPrize) {
    return `${dictionary["Complete 4 of 6 quests to claim the daily prize of"] ?? "Complete 4 of 6 quests to claim the daily prize of"} ${dailyPrize[1]} ${dictionary["gold coins."] ?? "gold coins."}`;
  }

  const dailyPrizeShort = /^Complete 4 of 6 quests to claim (\d+) gold coins\.$/.exec(source);
  if (dailyPrizeShort) {
    return `${dictionary["Complete 4 of 6 quests to claim"] ?? "Complete 4 of 6 quests to claim"} ${dailyPrizeShort[1]} ${dictionary["gold coins."] ?? "gold coins."}`;
  }

  const resetsIn = /^Resets in (.+)$/.exec(source);
  if (resetsIn) {
    return `${dictionary["Resets in"] ?? "Resets in"} ${resetsIn[1]}`;
  }

  const todayBonus = /^Today \+(\d+)$/.exec(source);
  if (todayBonus) {
    return `${dictionary.Today ?? "Today"} +${todayBonus[1]}`;
  }

  const playTodayBonus = /^Play today \+(\d+)$/.exec(source);
  if (playTodayBonus) {
    return `${dictionary["Play today"] ?? "Play today"} +${playTodayBonus[1]}`;
  }

  const weeklyStreak = /^Streak (\d+) - (\d+)\/7 toward \+5$/.exec(source);
  if (weeklyStreak) {
    return `${dictionary.Streak ?? "Streak"} ${weeklyStreak[1]} - ${weeklyStreak[2]}/7 ${dictionary["toward +5"] ?? "toward +5"}`;
  }

  const dayLabel = /^Day (\d+)$/.exec(source);
  if (dayLabel) {
    return `${dictionary.Day ?? "Day"} ${dayLabel[1]}`;
  }

  const bonusDays = /^(\d+) days? to \+5 bonus coins$/.exec(source);
  if (bonusDays) {
    const key = bonusDays[1] === "1" ? "day to +5 bonus coins" : "days to +5 bonus coins";
    return `${bonusDays[1]} ${dictionary[key] ?? key}`;
  }

  const dailyPlaySummary = /^1 coin each day you play\. (.+)\.$/.exec(source);
  if (dailyPlaySummary) {
    return `${dictionary["1 coin each day you play."] ?? "1 coin each day you play."} ${translateTrimmed(dailyPlaySummary[1], language) ?? dailyPlaySummary[1]}.`;
  }

  const nextRunTarget = /^(.+) - target ([A-Za-z]{1,3})$/.exec(source);
  if (nextRunTarget) {
    const levelName = translateTrimmed(nextRunTarget[1], language) ?? nextRunTarget[1];
    return `${levelName} - ${dictionary.target ?? "target"} ${nextRunTarget[2]}`;
  }

  const highestAtomLine = /^Highest ([A-Za-z]{1,3}) #(\d+)$/.exec(source);
  if (highestAtomLine) {
    return `${dictionary.Highest ?? "Highest"} ${highestAtomLine[1]} #${highestAtomLine[2]}`;
  }

  const scoreLine = /^(.+) score$/.exec(source);
  if (scoreLine) {
    return `${scoreLine[1]} ${dictionary.score ?? "score"}`;
  }

  const campaignProgress = /^(\d+)% campaign$/.exec(source);
  if (campaignProgress) {
    return `${campaignProgress[1]}% ${dictionary.campaign ?? "campaign"}`;
  }

  const percentFound = /^(\d+)% found$/.exec(source);
  if (percentFound) {
    return `${percentFound[1]}% ${dictionary.found ?? "found"}`;
  }

  const perfectCount = /^(\d+) perfect$/.exec(source);
  if (perfectCount) {
    return `${perfectCount[1]} ${dictionary.perfect ?? "perfect"}`;
  }

  const elementDiscoveryCount = /^(\d+) \/ 118 elements discovered$/.exec(source);
  if (elementDiscoveryCount) {
    return `${elementDiscoveryCount[1]} / 118 ${dictionary["elements discovered"] ?? "elements discovered"}`;
  }

  const unlockedAt = /^Unlocked at level (\d+)\.$/.exec(source);
  if (unlockedAt) {
    return `${dictionary["Unlocked at level"] ?? "Unlocked at level"} ${unlockedAt[1]}.`;
  }

  const secretUnlock = /^Secret unlock at level (\d+)$/.exec(source);
  if (secretUnlock) {
    return `${dictionary["Secret unlock at level"] ?? "Secret unlock at level"} ${secretUnlock[1]}`;
  }

  const defeatLevel = /^Defeat Lv (\d+)$/.exec(source);
  if (defeatLevel) {
    return `${dictionary["Defeat Lv"] ?? "Defeat Lv"} ${defeatLevel[1]}`;
  }

  const unlocksLevel = /^UNLOCKS LV (\d+)$/.exec(source);
  if (unlocksLevel) {
    return `${dictionary["UNLOCKS LV"] ?? "UNLOCKS LV"} ${unlocksLevel[1]}`;
  }

  const lockedLevel = /^LOCKED LV (\d+)$/.exec(source);
  if (lockedLevel) {
    return `${dictionary["LOCKED LV"] ?? "LOCKED LV"} ${lockedLevel[1]}`;
  }

  const upperLevel = /^LEVEL (\d+)$/.exec(source);
  if (upperLevel) {
    return `${dictionary.LEVEL ?? "LEVEL"} ${upperLevel[1]}`;
  }

  const discoverEveryPeriod =
    /^Discover every Period (\d+) element(?:, including (lanthanides|actinides))?\.$/.exec(
      source,
    );
  if (discoverEveryPeriod) {
    const template = dictionary["Discover every Period {n} element"];
    const base = template
      ? template.replace("{n}", discoverEveryPeriod[1])
      : `${dictionary["Discover every Period"] ?? "Discover every Period"} ${discoverEveryPeriod[1]} ${dictionary.element ?? "element"}`;
    const suffix = discoverEveryPeriod[2]
      ? `, ${dictionary[`including ${discoverEveryPeriod[2]}`] ?? `including ${discoverEveryPeriod[2]}`}`
      : "";
    return `${base}${suffix}.`;
  }

  const discoverEveryGroup = /^Discover every Group (\d+) element\.$/.exec(source);
  if (discoverEveryGroup) {
    const template = dictionary["Discover every Group {n} element"];
    return template
      ? `${template.replace("{n}", discoverEveryGroup[1])}.`
      : `${dictionary["Discover every Group"] ?? "Discover every Group"} ${discoverEveryGroup[1]} ${dictionary.element ?? "element"}.`;
  }

  const discoverEvery = /^Discover every (.+)\.$/.exec(source);
  if (discoverEvery) {
    const item = translateTrimmed(discoverEvery[1], language) ?? discoverEvery[1];
    return `${dictionary["Discover every"] ?? "Discover every"} ${item}.`;
  }

  const discover = /^Discover (.+)\.$/.exec(source);
  if (discover) {
    const item = translateTrimmed(discover[1], language) ?? discover[1];
    return `${dictionary.Discover ?? "Discover"} ${item}.`;
  }

  const reach = /^Reach (.+)\.$/.exec(source);
  if (reach) {
    const item = translateTrimmed(reach[1], language) ?? reach[1];
    return `${dictionary.Reach ?? "Reach"} ${item}.`;
  }

  const obtained = /^Obtained: (.+)$/.exec(source);
  if (obtained) {
    const inner = translateTrimmed(obtained[1], language) ?? obtained[1];
    return `${dictionary["Obtained:"] ?? "Obtained:"} ${inner}`;
  }

  const owned = /^Owned: (\d+)$/.exec(source);
  if (owned) {
    return `${dictionary["Owned:"] ?? "Owned:"} ${owned[1]}`;
  }

  const foundTimes = /^Found x(\d+)$/.exec(source);
  if (foundTimes) {
    return `${dictionary["Found x"] ?? "Found x"}${foundTimes[1]}`;
  }

  const foundCount = /^Found (\d+) times?$/.exec(source);
  if (foundCount) {
    return `${dictionary.Found ?? "Found"} ${foundCount[1]} ${foundCount[1] === "1" ? (dictionary.time ?? "time") : (dictionary.times ?? "times")}`;
  }

  const noCoins = /^You need (\d+) gold coins? to buy (.+)\.$/.exec(source);
  if (noCoins) {
    const item = translateTrimmed(noCoins[2], language) ?? noCoins[2];
    return `${dictionary["You need"] ?? "You need"} ${noCoins[1]} ${dictionary["gold coins"] ?? "gold coins"} ${dictionary["to buy"] ?? "to buy"} ${item}.`;
  }

  const addedInventory = /^(.+) added to your inventory\.$/.exec(source);
  if (addedInventory) {
    const item = translateTrimmed(addedInventory[1], language) ?? addedInventory[1];
    return `${item} ${dictionary["added to your inventory."] ?? "added to your inventory."}`;
  }

  const introducedAt = /^(.+) is introduced at level (\d+)\.$/.exec(source);
  if (introducedAt) {
    const item = translateTrimmed(introducedAt[1], language) ?? introducedAt[1];
    return `${item} ${dictionary["is introduced at level"] ?? "is introduced at level"} ${introducedAt[2]}.`;
  }

  const coinPurchaseAdded = /^(\d+) gold coins? added from App Store purchase\.$/.exec(source);
  if (coinPurchaseAdded) {
    return `${coinPurchaseAdded[1]} ${dictionary["gold coins"] ?? "gold coins"} ${dictionary["added from App Store purchase."] ?? "added from App Store purchase."}`;
  }

  return undefined;
}

const TRANSLATIONS: Partial<Record<AppLanguage, TranslationMap>> = {
  "zh-Hans": {
    Menu: "菜单",
    Back: "返回",
    "Back to game": "返回游戏",
    Shop: "商店",
    Play: "开始",
    Map: "地图",
    Collection: "收藏",
    Settings: "设置",
    Profile: "个人资料",
    Lab: "实验室",
    Library: "图鉴",
    Level: "关卡",
    of: "共",
    "Free Lab": "免费实验室",
    "Pro Lab active": "专业实验室已启用",
    "PLAYER PROFILE": "玩家资料",
    "Fusion Rush Chemist": "Fusion Rush 化学家",
    "PRO LAB PACK ACTIVE": "专业实验室包已启用",
    "Total Score": "总分",
    career: "生涯",
    "Gold Coins": "金币",
    "shop currency": "商店货币",
    "Daily Streak": "每日连续",
    claimed: "已领取",
    active: "进行中",
    "Best Combo": "最佳连击",
    "no record yet": "暂无记录",
    "Highest Atom": "最高原子",
    Elements: "元素",
    Stars: "星级",
    perfect: "完美",
    Display: "显示",
    Theme: "主题",
    Dark: "深色",
    Light: "浅色",
    Language: "语言",
    "Daily Lab": "每日实验室",
    "quests complete today.": "个任务今日完成。",
    "Complete 4 of 6 quests to claim the daily prize of": "完成 6 个任务中的 4 个以领取每日奖励",
    "gold coins.": "金币。",
    "gold coins": "金币",
    " (includes +2 Pro bonus)": "（包含 +2 专业奖励）",
    Records: "记录",
    "Best challenge score": "最佳挑战分数",
    "Badges earned": "已获得徽章",
    "Campaign levels unlocked": "已解锁战役关卡",
    "Periodic table progress": "元素周期表进度",
    "Lock stages": "锁定关卡",
    "Unlock all stages": "解锁所有关卡",
    "Enter unlock password": "输入解锁密码",
    "Wrong password.": "密码错误。",
    "Convert points into gold coins and stock your next run": "将积分兑换为金币，为下一局做好准备",
    "ONE-TIME UPGRADE": "一次性升级",
    "Pro Lab Pack - Lifetime": "专业实验室包 - 终身",
    Available: "可用",
    "A one-time premium upgrade for long-term progression.": "用于长期进度的一次性高级升级。",
    "Remove forced interstitial ads.": "移除强制插屏广告。",
    "Unlock the Pro Lab profile badge.": "解锁专业实验室资料徽章。",
    "Get 50 starting gold coins.": "获得 50 枚初始金币。",
    "Get +2 extra gold coins on each daily gold claim.": "每次领取每日金币时额外获得 +2 金币。",
    Restore: "恢复",
    "Unlock Pack": "解锁礼包",
    "Manage Purchases": "管理购买",
    "APP STORE COINS": "APP STORE 金币",
    "Buy gold coins": "购买金币",
    "Watch rewarded ad for +1 coin": "观看奖励广告获得 +1 金币",
    "App Store": "App Store",
    "INVENTORY POWER-UPS": "库存强化",
    "Stock your next run": "为下一局备货",
    "Buy extra inventory copies with gold coins. Before each level, you can choose up to 3 inventory power-ups to start with.":
      "用金币购买额外库存。每个关卡开始前，你最多可选择 3 个库存强化。",
    Secret: "秘密",
    "Owned:": "拥有：",
    "Unlocked at level": "在关卡解锁",
    "Secret unlock at level": "秘密解锁于关卡",
    "You need": "你需要",
    "to buy": "购买",
    "added to your inventory.": "已加入库存。",
    "is introduced at level": "将在关卡引入",
    Support: "支持",
    "Need help with Atomic Fusion Rush? We are happy to help.":
      "需要 Atomic Fusion Rush 帮助？我们很乐意协助。",
    Contact: "联系",
    "Typical response time: 1-3 business days.": "通常回复时间：1-3 个工作日。",
    "How to Report an Issue": "如何报告问题",
    "Terms of Service": "服务条款",
    "Privacy Policy": "隐私政策",
    "Last updated:": "最后更新：",
  },
  es: {
    Menu: "Menú",
    Back: "Atrás",
    "Back to game": "Volver al juego",
    Shop: "Tienda",
    Play: "Jugar",
    Map: "Mapa",
    Collection: "Colección",
    Settings: "Ajustes",
    Profile: "Perfil",
    Lab: "Laboratorio",
    Library: "Biblioteca",
    Level: "Nivel",
    of: "de",
    "Free Lab": "Laboratorio gratis",
    "Pro Lab active": "Laboratorio Pro activo",
    "PLAYER PROFILE": "PERFIL DEL JUGADOR",
    "Fusion Rush Chemist": "Químico de Fusion Rush",
    "PRO LAB PACK ACTIVE": "PACK LAB PRO ACTIVO",
    "Total Score": "Puntuación total",
    career: "carrera",
    "Gold Coins": "Monedas de oro",
    "shop currency": "moneda de tienda",
    "Daily Streak": "Racha diaria",
    claimed: "reclamado",
    active: "activo",
    "Best Combo": "Mejor combo",
    "no record yet": "sin récord",
    "Highest Atom": "Átomo más alto",
    Elements: "Elementos",
    Stars: "Estrellas",
    perfect: "perfecto",
    Display: "Pantalla",
    Theme: "Tema",
    Dark: "Oscuro",
    Light: "Claro",
    Language: "Idioma",
    "Daily Lab": "Laboratorio diario",
    "quests complete today.": "misiones completadas hoy.",
    "Complete 4 of 6 quests to claim the daily prize of":
      "Completa 4 de 6 misiones para reclamar el premio diario de",
    "gold coins.": "monedas de oro.",
    "gold coins": "monedas de oro",
    " (includes +2 Pro bonus)": " (incluye +2 bono Pro)",
    Records: "Récords",
    "Best challenge score": "Mejor puntuación de desafío",
    "Badges earned": "Insignias ganadas",
    "Campaign levels unlocked": "Niveles de campaña desbloqueados",
    "Periodic table progress": "Progreso de la tabla periódica",
    "Lock stages": "Bloquear fases",
    "Unlock all stages": "Desbloquear todas las fases",
    "Enter unlock password": "Introduce la contraseña",
    "Wrong password.": "Contraseña incorrecta.",
    "Convert points into gold coins and stock your next run":
      "Convierte puntos en monedas de oro y prepara tu próxima partida",
    "ONE-TIME UPGRADE": "MEJORA ÚNICA",
    "Pro Lab Pack - Lifetime": "Pack Lab Pro - De por vida",
    Available: "Disponible",
    "A one-time premium upgrade for long-term progression.":
      "Una mejora premium única para progresar a largo plazo.",
    "Remove forced interstitial ads.": "Elimina anuncios intersticiales obligatorios.",
    "Unlock the Pro Lab profile badge.": "Desbloquea la insignia de perfil Lab Pro.",
    "Get 50 starting gold coins.": "Obtén 50 monedas de oro iniciales.",
    "Get +2 extra gold coins on each daily gold claim.":
      "Obtén +2 monedas de oro extra en cada recompensa diaria.",
    Restore: "Restaurar",
    "Unlock Pack": "Desbloquear pack",
    "Manage Purchases": "Gestionar compras",
    "APP STORE COINS": "MONEDAS APP STORE",
    "Buy gold coins": "Comprar monedas de oro",
    "Watch rewarded ad for +1 coin": "Ver anuncio recompensado por +1 moneda",
    "App Store": "App Store",
    "INVENTORY POWER-UPS": "POTENCIADORES",
    "Stock your next run": "Prepara tu próxima partida",
    "Buy extra inventory copies with gold coins. Before each level, you can choose up to 3 inventory power-ups to start with.":
      "Compra copias extra con monedas de oro. Antes de cada nivel puedes elegir hasta 3 potenciadores iniciales.",
    Secret: "Secreto",
    "Owned:": "Tienes:",
    "Unlocked at level": "Desbloqueado en el nivel",
    "Secret unlock at level": "Se desbloquea en secreto en el nivel",
    "You need": "Necesitas",
    "to buy": "para comprar",
    "added to your inventory.": "añadido a tu inventario.",
    "is introduced at level": "se presenta en el nivel",
    Support: "Soporte",
    "Need help with Atomic Fusion Rush? We are happy to help.":
      "¿Necesitas ayuda con Atomic Fusion Rush? Encantados de ayudarte.",
    Contact: "Contacto",
    "Typical response time: 1-3 business days.":
      "Tiempo de respuesta habitual: 1-3 días laborables.",
    "How to Report an Issue": "Cómo informar de un problema",
    "Terms of Service": "Términos del servicio",
    "Privacy Policy": "Política de privacidad",
    "Last updated:": "Última actualización:",
  },
  hi: {
    Menu: "मेनू",
    Back: "वापस",
    Shop: "दुकान",
    Play: "खेलें",
    Map: "मानचित्र",
    Collection: "संग्रह",
    Settings: "सेटिंग्स",
    Profile: "प्रोफाइल",
    Lab: "लैब",
    Library: "लाइब्रेरी",
    Level: "स्तर",
    of: "में से",
    "Free Lab": "मुफ्त लैब",
    "Pro Lab active": "प्रो लैब सक्रिय",
    "PLAYER PROFILE": "खिलाड़ी प्रोफाइल",
    "Fusion Rush Chemist": "Fusion Rush रसायनज्ञ",
    "Total Score": "कुल स्कोर",
    career: "करियर",
    "Gold Coins": "सोने के सिक्के",
    "Daily Streak": "दैनिक क्रम",
    claimed: "ले लिया",
    active: "सक्रिय",
    "Best Combo": "सर्वश्रेष्ठ कॉम्बो",
    "Highest Atom": "सबसे ऊँचा परमाणु",
    Elements: "तत्व",
    Stars: "सितारे",
    Display: "दिखावट",
    Theme: "थीम",
    Dark: "डार्क",
    Light: "लाइट",
    Language: "भाषा",
    "Daily Lab": "दैनिक लैब",
    "quests complete today.": "क्वेस्ट आज पूरी हुईं।",
    Records: "रिकॉर्ड",
    "ONE-TIME UPGRADE": "एक बार का अपग्रेड",
    "Pro Lab Pack - Lifetime": "प्रो लैब पैक - आजीवन",
    Available: "उपलब्ध",
    Restore: "पुनर्स्थापित करें",
    "Unlock Pack": "पैक अनलॉक करें",
    "Manage Purchases": "खरीद प्रबंधित करें",
    "Buy gold coins": "सोने के सिक्के खरीदें",
    Secret: "गुप्त",
    "Owned:": "मौजूद:",
    Support: "सहायता",
    Contact: "संपर्क",
    "Terms of Service": "सेवा की शर्तें",
    "Privacy Policy": "गोपनीयता नीति",
  },
  ar: {
    Menu: "القائمة",
    Back: "رجوع",
    Shop: "المتجر",
    Play: "العب",
    Map: "الخريطة",
    Collection: "المجموعة",
    Settings: "الإعدادات",
    Profile: "الملف الشخصي",
    Lab: "المختبر",
    Library: "المكتبة",
    Level: "المستوى",
    of: "من",
    "Free Lab": "مختبر مجاني",
    "Pro Lab active": "مختبر Pro نشط",
    "PLAYER PROFILE": "ملف اللاعب",
    "Fusion Rush Chemist": "كيميائي Fusion Rush",
    "Total Score": "المجموع",
    career: "المسيرة",
    "Gold Coins": "عملات ذهبية",
    "Daily Streak": "السلسلة اليومية",
    claimed: "تم الاستلام",
    active: "نشط",
    "Best Combo": "أفضل سلسلة",
    "Highest Atom": "أعلى ذرة",
    Elements: "العناصر",
    Stars: "نجوم",
    Display: "العرض",
    Theme: "السمة",
    Dark: "داكن",
    Light: "فاتح",
    Language: "اللغة",
    "Daily Lab": "المختبر اليومي",
    "quests complete today.": "مهام مكتملة اليوم.",
    Records: "السجلات",
    "ONE-TIME UPGRADE": "ترقية لمرة واحدة",
    "Pro Lab Pack - Lifetime": "حزمة مختبر Pro - مدى الحياة",
    Available: "متاح",
    Restore: "استعادة",
    "Unlock Pack": "فتح الحزمة",
    "Manage Purchases": "إدارة المشتريات",
    "Buy gold coins": "شراء عملات ذهبية",
    Secret: "سري",
    "Owned:": "مملوك:",
    Support: "الدعم",
    Contact: "اتصال",
    "Terms of Service": "شروط الخدمة",
    "Privacy Policy": "سياسة الخصوصية",
  },
  "pt-BR": {
    Menu: "Menu",
    Back: "Voltar",
    Shop: "Loja",
    Play: "Jogar",
    Map: "Mapa",
    Collection: "Coleção",
    Settings: "Ajustes",
    Profile: "Perfil",
    Lab: "Laboratório",
    Library: "Biblioteca",
    Level: "Nível",
    of: "de",
    "PLAYER PROFILE": "PERFIL DO JOGADOR",
    "Total Score": "Pontuação total",
    "Gold Coins": "Moedas de ouro",
    "Daily Streak": "Sequência diária",
    "Best Combo": "Melhor combo",
    Elements: "Elementos",
    Stars: "Estrelas",
    Display: "Tela",
    Theme: "Tema",
    Dark: "Escuro",
    Light: "Claro",
    Language: "Idioma",
    "Daily Lab": "Laboratório diário",
    Records: "Recordes",
    "ONE-TIME UPGRADE": "MELHORIA ÚNICA",
    "Pro Lab Pack - Lifetime": "Pacote Lab Pro - Vitalício",
    Available: "Disponível",
    Restore: "Restaurar",
    "Unlock Pack": "Desbloquear pacote",
    "Manage Purchases": "Gerenciar compras",
    "Buy gold coins": "Comprar moedas de ouro",
    Secret: "Secreto",
    Support: "Suporte",
    Contact: "Contato",
    "Terms of Service": "Termos de serviço",
    "Privacy Policy": "Política de privacidade",
  },
};

for (const language of ["fr", "de", "ja", "ko", "ru", "id", "tr", "it", "vi"] as const) {
  TRANSLATIONS[language] = makeCompactTranslation(language);
}

function makeCompactTranslation(
  language: Exclude<AppLanguage, "en" | "zh-Hans" | "es" | "hi" | "ar" | "pt-BR">,
): TranslationMap {
  const compact: Record<typeof language, TranslationMap> = {
    fr: {
      Menu: "Menu",
      Back: "Retour",
      Shop: "Boutique",
      Play: "Jouer",
      Map: "Carte",
      Collection: "Collection",
      Settings: "Réglages",
      Profile: "Profil",
      Lab: "Labo",
      Library: "Bibliothèque",
      Level: "Niveau",
      of: "sur",
      "PLAYER PROFILE": "PROFIL JOUEUR",
      "Total Score": "Score total",
      "Gold Coins": "Pièces d’or",
      "Daily Streak": "Série quotidienne",
      "Best Combo": "Meilleur combo",
      Elements: "Éléments",
      Stars: "Étoiles",
      Display: "Affichage",
      Theme: "Thème",
      Dark: "Sombre",
      Light: "Clair",
      Language: "Langue",
      "Daily Lab": "Labo quotidien",
      Records: "Records",
      "Pro Lab Pack - Lifetime": "Pack Labo Pro - À vie",
      Available: "Disponible",
      Restore: "Restaurer",
      "Unlock Pack": "Débloquer le pack",
      "Manage Purchases": "Gérer les achats",
      "Buy gold coins": "Acheter des pièces d’or",
      Secret: "Secret",
      Support: "Assistance",
      Contact: "Contact",
    },
    de: {
      Menu: "Menü",
      Back: "Zurück",
      Shop: "Shop",
      Play: "Spielen",
      Map: "Karte",
      Collection: "Sammlung",
      Settings: "Einstellungen",
      Profile: "Profil",
      Lab: "Labor",
      Library: "Bibliothek",
      Level: "Level",
      of: "von",
      "PLAYER PROFILE": "SPIELERPROFIL",
      "Total Score": "Gesamtpunktzahl",
      "Gold Coins": "Goldmünzen",
      "Daily Streak": "Tages-Serie",
      "Best Combo": "Beste Kombo",
      Elements: "Elemente",
      Stars: "Sterne",
      Display: "Anzeige",
      Theme: "Design",
      Dark: "Dunkel",
      Light: "Hell",
      Language: "Sprache",
      "Daily Lab": "Tageslabor",
      Records: "Rekorde",
      "Pro Lab Pack - Lifetime": "Pro-Labor-Paket - Lebenslang",
      Available: "Verfügbar",
      Restore: "Wiederherstellen",
      "Unlock Pack": "Paket freischalten",
      "Manage Purchases": "Käufe verwalten",
      "Buy gold coins": "Goldmünzen kaufen",
      Secret: "Geheim",
      Support: "Support",
      Contact: "Kontakt",
    },
    ja: {
      Menu: "メニュー",
      Back: "戻る",
      Shop: "ショップ",
      Play: "プレイ",
      Map: "マップ",
      Collection: "コレクション",
      Settings: "設定",
      Profile: "プロフィール",
      Lab: "ラボ",
      Library: "ライブラリ",
      Level: "レベル",
      of: "/",
      "PLAYER PROFILE": "プレイヤープロフィール",
      "Total Score": "合計スコア",
      "Gold Coins": "ゴールドコイン",
      "Daily Streak": "デイリーストリーク",
      "Best Combo": "最高コンボ",
      Elements: "元素",
      Stars: "スター",
      Display: "表示",
      Theme: "テーマ",
      Dark: "ダーク",
      Light: "ライト",
      Language: "言語",
      "Daily Lab": "デイリーラボ",
      Records: "記録",
      "Pro Lab Pack - Lifetime": "プロラボパック - 永久",
      Available: "利用可能",
      Restore: "復元",
      "Unlock Pack": "パックを解除",
      "Manage Purchases": "購入を管理",
      "Buy gold coins": "ゴールドコインを購入",
      Secret: "シークレット",
      Support: "サポート",
      Contact: "連絡先",
    },
    ko: {
      Menu: "메뉴",
      Back: "뒤로",
      Shop: "상점",
      Play: "플레이",
      Map: "지도",
      Collection: "컬렉션",
      Settings: "설정",
      Profile: "프로필",
      Lab: "실험실",
      Library: "라이브러리",
      Level: "레벨",
      of: "/",
      "PLAYER PROFILE": "플레이어 프로필",
      "Total Score": "총점",
      "Gold Coins": "골드 코인",
      "Daily Streak": "일일 연속",
      "Best Combo": "최고 콤보",
      Elements: "원소",
      Stars: "별",
      Display: "표시",
      Theme: "테마",
      Dark: "다크",
      Light: "라이트",
      Language: "언어",
      "Daily Lab": "일일 실험실",
      Records: "기록",
      "Pro Lab Pack - Lifetime": "프로 랩 팩 - 평생",
      Available: "사용 가능",
      Restore: "복원",
      "Unlock Pack": "팩 잠금 해제",
      "Manage Purchases": "구매 관리",
      "Buy gold coins": "골드 코인 구매",
      Secret: "비밀",
      Support: "지원",
      Contact: "문의",
    },
    ru: {
      Menu: "Меню",
      Back: "Назад",
      Shop: "Магазин",
      Play: "Играть",
      Map: "Карта",
      Collection: "Коллекция",
      Settings: "Настройки",
      Profile: "Профиль",
      Lab: "Лаборатория",
      Library: "Библиотека",
      Level: "Уровень",
      of: "из",
      "PLAYER PROFILE": "ПРОФИЛЬ ИГРОКА",
      "Total Score": "Общий счет",
      "Gold Coins": "Золотые монеты",
      "Daily Streak": "Ежедневная серия",
      "Best Combo": "Лучшее комбо",
      Elements: "Элементы",
      Stars: "Звезды",
      Display: "Экран",
      Theme: "Тема",
      Dark: "Темная",
      Light: "Светлая",
      Language: "Язык",
      "Daily Lab": "Ежедневная лаборатория",
      Records: "Рекорды",
      "Pro Lab Pack - Lifetime": "Пакет Pro Lab - навсегда",
      Available: "Доступно",
      Restore: "Восстановить",
      "Unlock Pack": "Разблокировать пакет",
      "Manage Purchases": "Управлять покупками",
      "Buy gold coins": "Купить золотые монеты",
      Secret: "Секрет",
      Support: "Поддержка",
      Contact: "Контакт",
    },
    id: {
      Menu: "Menu",
      Back: "Kembali",
      Shop: "Toko",
      Play: "Main",
      Map: "Peta",
      Collection: "Koleksi",
      Settings: "Pengaturan",
      Profile: "Profil",
      Lab: "Lab",
      Library: "Perpustakaan",
      Level: "Level",
      of: "dari",
      "PLAYER PROFILE": "PROFIL PEMAIN",
      "Total Score": "Skor total",
      "Gold Coins": "Koin emas",
      "Daily Streak": "Rangkaian harian",
      "Best Combo": "Kombo terbaik",
      Elements: "Elemen",
      Stars: "Bintang",
      Display: "Tampilan",
      Theme: "Tema",
      Dark: "Gelap",
      Light: "Terang",
      Language: "Bahasa",
      "Daily Lab": "Lab harian",
      Records: "Rekor",
      "Pro Lab Pack - Lifetime": "Paket Lab Pro - Seumur hidup",
      Available: "Tersedia",
      Restore: "Pulihkan",
      "Unlock Pack": "Buka paket",
      "Manage Purchases": "Kelola pembelian",
      "Buy gold coins": "Beli koin emas",
      Secret: "Rahasia",
      Support: "Dukungan",
      Contact: "Kontak",
    },
    tr: {
      Menu: "Menü",
      Back: "Geri",
      Shop: "Mağaza",
      Play: "Oyna",
      Map: "Harita",
      Collection: "Koleksiyon",
      Settings: "Ayarlar",
      Profile: "Profil",
      Lab: "Laboratuvar",
      Library: "Kütüphane",
      Level: "Seviye",
      of: "/",
      "PLAYER PROFILE": "OYUNCU PROFİLİ",
      "Total Score": "Toplam skor",
      "Gold Coins": "Altın paralar",
      "Daily Streak": "Günlük seri",
      "Best Combo": "En iyi kombo",
      Elements: "Elementler",
      Stars: "Yıldızlar",
      Display: "Görüntü",
      Theme: "Tema",
      Dark: "Koyu",
      Light: "Açık",
      Language: "Dil",
      "Daily Lab": "Günlük laboratuvar",
      Records: "Kayıtlar",
      "Pro Lab Pack - Lifetime": "Pro Lab Paketi - Ömür boyu",
      Available: "Mevcut",
      Restore: "Geri yükle",
      "Unlock Pack": "Paketi aç",
      "Manage Purchases": "Satın almaları yönet",
      "Buy gold coins": "Altın para satın al",
      Secret: "Gizli",
      Support: "Destek",
      Contact: "İletişim",
    },
    it: {
      Menu: "Menu",
      Back: "Indietro",
      Shop: "Negozio",
      Play: "Gioca",
      Map: "Mappa",
      Collection: "Collezione",
      Settings: "Impostazioni",
      Profile: "Profilo",
      Lab: "Laboratorio",
      Library: "Biblioteca",
      Level: "Livello",
      of: "di",
      "PLAYER PROFILE": "PROFILO GIOCATORE",
      "Total Score": "Punteggio totale",
      "Gold Coins": "Monete d’oro",
      "Daily Streak": "Serie giornaliera",
      "Best Combo": "Miglior combo",
      Elements: "Elementi",
      Stars: "Stelle",
      Display: "Schermo",
      Theme: "Tema",
      Dark: "Scuro",
      Light: "Chiaro",
      Language: "Lingua",
      "Daily Lab": "Laboratorio giornaliero",
      Records: "Record",
      "Pro Lab Pack - Lifetime": "Pacchetto Lab Pro - A vita",
      Available: "Disponibile",
      Restore: "Ripristina",
      "Unlock Pack": "Sblocca pacchetto",
      "Manage Purchases": "Gestisci acquisti",
      "Buy gold coins": "Compra monete d’oro",
      Secret: "Segreto",
      Support: "Supporto",
      Contact: "Contatto",
    },
    vi: {
      Menu: "Menu",
      Back: "Quay lại",
      Shop: "Cửa hàng",
      Play: "Chơi",
      Map: "Bản đồ",
      Collection: "Bộ sưu tập",
      Settings: "Cài đặt",
      Profile: "Hồ sơ",
      Lab: "Phòng thí nghiệm",
      Library: "Thư viện",
      Level: "Cấp",
      of: "trên",
      "PLAYER PROFILE": "HỒ SƠ NGƯỜI CHƠI",
      "Total Score": "Tổng điểm",
      "Gold Coins": "Xu vàng",
      "Daily Streak": "Chuỗi hằng ngày",
      "Best Combo": "Combo tốt nhất",
      Elements: "Nguyên tố",
      Stars: "Sao",
      Display: "Hiển thị",
      Theme: "Giao diện",
      Dark: "Tối",
      Light: "Sáng",
      Language: "Ngôn ngữ",
      "Daily Lab": "Phòng thí nghiệm ngày",
      Records: "Kỷ lục",
      "Pro Lab Pack - Lifetime": "Gói Lab Pro - Trọn đời",
      Available: "Có sẵn",
      Restore: "Khôi phục",
      "Unlock Pack": "Mở khóa gói",
      "Manage Purchases": "Quản lý mua hàng",
      "Buy gold coins": "Mua xu vàng",
      Secret: "Bí mật",
      Support: "Hỗ trợ",
      Contact: "Liên hệ",
    },
  };
  return compact[language];
}

const ITALIAN_TRANSLATION_EXTENSIONS: TranslationMap = {
  "Open settings": "Apri impostazioni",
  "Open profile": "Apri profilo",
  "Back to game": "Torna al gioco",
  "← Menu": "← Menu",
  "← Back": "← Indietro",
  "Fusion Rush Chemist": "Chimico di Fusion Rush",
  "Free Lab": "Laboratorio gratuito",
  "Pro Lab active": "Lab Pro attivo",
  "PRO LAB ACTIVE": "LAB PRO ATTIVO",
  "PRO LAB PACK ACTIVE": "PACCHETTO LAB PRO ATTIVO",
  "Highest Atom": "Atomo più alto",
  "HIGHEST ATOM": "ATOMO PIÙ ALTO",
  "shop currency": "valuta del negozio",
  career: "carriera",
  claimed: "riscattata",
  active: "attiva",
  "no record yet": "nessun record",
  found: "trovati",
  perfect: "perfetti",
  Streak: "Serie",
  quests: "missioni",
  "quests complete today.": "missioni completate oggi.",
  "Complete 4 of 6 quests to claim the daily prize of":
    "Completa 4 missioni su 6 per ottenere il premio giornaliero di",
  "Complete 4 of 6 quests to claim": "Completa 4 missioni su 6 per ottenere",
  "gold coins.": "monete d'oro.",
  "gold coins": "monete d'oro",
  " (includes +2 Pro bonus)": " (include il bonus Pro +2)",
  "Best challenge score": "Miglior punteggio sfida",
  "Badges earned": "Distintivi ottenuti",
  "Campaign levels unlocked": "Livelli campagna sbloccati",
  "Periodic table progress": "Progresso tavola periodica",
  "Lock stages": "Blocca livelli",
  "Unlock all stages": "Sblocca tutti i livelli",
  "Enter unlock password": "Inserisci la password di sblocco",
  "Wrong password.": "Password errata.",
  "Clear 1 stage": "Completa 1 livello",
  "Discover 1 element": "Scopri 1 elemento",
  "Earn 3 stars": "Ottieni 3 stelle",
  "Trigger a 4-step chain": "Attiva una catena di 4 passaggi",
  "Merge 50 atoms": "Fondi 50 atomi",
  "Purchase an item from the shop": "Compra un oggetto dal negozio",
  "Complete any campaign level without a game over.":
    "Completa qualsiasi livello campagna senza perdere.",
  "Reveal a new periodic-table entry.": "Rivela una nuova voce della tavola periodica.",
  "Collect three stars across today's runs.": "Raccogli tre stelle nelle partite di oggi.",
  "Land a shot that causes four cascading merges.":
    "Esegui un tiro che causa quattro fusioni a cascata.",
  "Create reactions by merging matching atoms.":
    "Crea reazioni fondendo atomi uguali.",
  "Spend saved score on any shop power-up.":
    "Spendi il punteggio accumulato per un potenziamento del negozio.",

  "NEXT RUN": "PROSSIMA PARTITA",
  "- target": "- obiettivo",
  target: "obiettivo",
  Continue: "Continua",
  Highest: "Massimo",
  score: "punti",
  campaign: "campagna",
  "Main game sections": "Sezioni principali",
  "DAILY LAB": "LAB GIORNALIERO",
  "Resets in": "Si azzera tra",
  Claim: "Riscatta",
  Claimed: "Riscattato",
  Today: "Oggi",
  "Play today": "Gioca oggi",
  "PLAY A GAME A DAY": "GIOCA UNA PARTITA AL GIORNO",
  "toward +5": "verso +5",
  Day: "Giorno",
  Next: "Prossimo",
  "1 coin each day you play.": "1 moneta ogni giorno in cui giochi.",
  "day to +5 bonus coins": "giorno al bonus di +5 monete",
  "days to +5 bonus coins": "giorni al bonus di +5 monete",
  "5 bonus coins earned": "bonus di 5 monete ottenuto",

  "LAB EXPERIMENTS": "ESPERIMENTI DI LABORATORIO",
  "Game Modes": "Modalità di gioco",
  "Try campaign variants, challenge rules, and Survival.":
    "Prova varianti della campagna, regole sfida e Sopravvivenza.",
  Campaign: "Campagna",
  CAMPAIGN: "CAMPAGNA",
  Survival: "Sopravvivenza",
  ENDLESS: "INFINITA",
  CHALLENGE: "SFIDA",
  "BOSS BATTLE": "BATTAGLIA BOSS",
  "Defeat Lv": "Sconfiggi Lv",
  Locked: "Bloccato",
  "Play Campaign": "Gioca campagna",
  "Start Mode": "Avvia modalità",
  "Boss Battle": "Battaglia boss",
  "Classic level progression with targets, stars, and discoveries.":
    "Progressione classica a livelli con obiettivi, stelle e scoperte.",
  "Reach the target element": "Raggiungi l'elemento obiettivo",
  "Earn stars for clean, fast clears": "Ottieni stelle completando in modo pulito e rapido",
  "Keep fusing while the red danger bar rises 5% every minute from the bottom.":
    "Continua a fondere mentre la barra rossa di pericolo sale dal basso del 5% ogni minuto.",
  "No fixed target pressure": "Nessuna pressione da obiettivo fisso",
  "Danger zone rises 5% every minute": "La zona di pericolo sale del 5% ogni minuto",
  "Last as long as possible": "Resisti il più a lungo possibile",
  "Elemental Boss": "Boss elementale",
  "Face a five-eyed elemental horror. Match its open eyes, charge a Blank atom in the center, and bring it down in 100 shots.":
    "Affronta un orrore elementale con cinque occhi. Abbina gli occhi aperti, carica un atomo Vuoto al centro e sconfiggilo entro 100 tiri.",
  "The boss has 20 health and only opens 1-2 eyes at a time":
    "Il boss ha 20 punti salute e apre solo 1-2 occhi alla volta",
  "Matching an open eye deals 1 damage, or 2 if your shot is shimmering":
    "Colpire un occhio aperto infligge 1 danno, o 2 se il tiro è scintillante",
  "Charge the center eye to 10 and earn a Blank atom for a guaranteed hit":
    "Carica l'occhio centrale fino a 10 e ottieni un atomo Vuoto per un colpo garantito",
  "Periodic Guardian": "Guardiano periodico",
  "The Periodic Guardian": "Il Guardiano periodico",
  "An ancient table guardian cycles through elemental phases. Match the active group, survive its e-beam, and break the core in 50 shots.":
    "Un antico guardiano della tavola alterna fasi elementali. Abbina il gruppo attivo, sopravvivi al suo e-beam e rompi il nucleo in 50 tiri.",
  "The weak spot cycles through Metals, Halogens, and Noble Gases every 3 seconds":
    "Il punto debole alterna Metalli, Alogeni e Gas nobili ogni 3 secondi",
  "Land 20 correct group shots before you run out of 50 attempts":
    "Metti a segno 20 colpi del gruppo corretto prima di esaurire i 50 tentativi",
  "Wait 5 seconds and the guardian vaporizes your current queued atom with an E-beam":
    "Aspetta 5 secondi e il guardiano vaporizza l'atomo in coda con un E-beam",
  "The Nucleus": "Il Nucleo",
  "A magnetic core bends every shot. Strip away its orbiting atoms, expose the hidden eye, and finish the core before it eats your queue.":
    "Un nucleo magnetico curva ogni tiro. Elimina gli atomi orbitanti, scopri l'occhio nascosto e finisci il nucleo prima che divori la coda.",
  "A black hole curves your shots and makes bounce angles matter":
    "Un buco nero curva i tiri e rende importanti gli angoli di rimbalzo",
  "Every few seconds the core fires one of its remaining orbit atoms":
    "Ogni pochi secondi il nucleo spara uno degli atomi rimasti in orbita",
  "Merge all orbit atoms away, then hit the exposed eye 3 times to win":
    "Fondi via tutti gli atomi orbitanti, poi colpisci l'occhio esposto 3 volte per vincere",
  "Unstable Isotopes": "Isotopi instabili",
  "Some atoms become unstable isotopes with period-based decay shells.":
    "Alcuni atomi diventano isotopi instabili con gusci di decadimento basati sul periodo.",
  "Unstable atoms lose 1 ring segment after each shot":
    "Gli atomi instabili perdono 1 segmento di anello dopo ogni tiro",
  "Merging stabilizes the isotope into the new atom for double points":
    "La fusione stabilizza l'isotopo nel nuovo atomo per punti doppi",
  "At 0 segments, it decays down by 1 element tier":
    "A 0 segmenti decade di 1 grado elementale",
  "Gravity Surge": "Impulso gravitazionale",
  "Every 5 shots, all atoms shift slightly downward toward danger.":
    "Ogni 5 tiri, tutti gli atomi scivolano leggermente verso il pericolo.",
  "Every 5 shots pushes the board downward": "Ogni 5 tiri spinge la plancia verso il basso",
  "Plan space before each surge": "Prepara spazio prima di ogni impulso",
  "Pure Hydrogen Run": "Corsa a idrogeno puro",
  "The queue starts mostly Hydrogen and Helium for long reaction chains.":
    "La coda parte soprattutto con Idrogeno ed Elio per lunghe catene di reazioni.",
  "Queue is biased toward Hydrogen and Helium": "La coda favorisce Idrogeno ed Elio",
  "Combos matter more than lucky high tiers": "Le combo contano più dei gradi alti fortunati",
  "Noble Gas Lock": "Blocco gas nobili",
  "Noble gases are stable and cannot merge until a power-up activates the board.":
    "I gas nobili sono stabili e non possono fondersi finché un potenziamento non attiva la plancia.",
  "Noble gases block normal merges": "I gas nobili bloccano le fusioni normali",
  "Use E-gun, Gravity, Emission, or Grab to unlock reactions":
    "Usa E-Gun, Gravità, Emissione o Presa per sbloccare le reazioni",
  "Fusion Rush Timer": "Timer Fusion Rush",
  "Reach the target before the lab clock expires.": "Raggiungi l'obiettivo prima che scada il tempo.",
  "180-second countdown": "Conto alla rovescia di 180 secondi",
  "Game over when time runs out": "Game over allo scadere del tempo",
  "Isotope Decay": "Decadimento isotopico",
  "Every 20 shots, every atom on the board lowers by 1 tier.":
    "Ogni 20 tiri, ogni atomo sulla plancia scende di 1 grado.",
  "Every 20 shots, all non-Hydrogen atoms decay by 1":
    "Ogni 20 tiri, tutti gli atomi non Idrogeno decadono di 1",
  "The shot counter flashes red on the warning shot":
    "Il contatore dei tiri lampeggia in rosso sul tiro di avviso",
  "Queue atoms are unchanged": "Gli atomi in coda restano invariati",

  "GAME LIBRARY": "BIBLIOTECA DI GIOCO",
  "Challenges & Power-Ups": "Sfide e potenziamenti",
  "Browse every challenge rule set and learn what each lab tool does.":
    "Sfoglia tutte le regole sfida e scopri cosa fa ogni strumento del laboratorio.",
  "Power-Ups": "Potenziamenti",
  Challenges: "Sfide",
  Bosses: "Boss",
  "UNLOCKS LV": "SBLOCCA LV",
  "LOCKED LV": "BLOCCATO LV",
  LEVEL: "LIVELLO",
  "Unknown Boss": "Boss sconosciuto",
  "Defeat this boss in Campaign to archive its field notes.":
    "Sconfiggi questo boss in Campagna per archiviare le sue note di campo.",
  "The first lab guardian is a stitched-together watcher grown from low-period atoms. It opens only a few eyes at once, forcing clean recognition instead of brute force.":
    "Il primo guardiano del laboratorio è una sentinella assemblata da atomi dei primi periodi. Apre solo pochi occhi alla volta, imponendo riconoscimento pulito invece della forza bruta.",
  "Match the open eye element to deal damage": "Abbina l'elemento dell'occhio aperto per infliggere danni",
  "Shimmer shots hit harder": "I tiri scintillanti colpiscono più forte",
  "Charge the center eye to earn Blank atoms": "Carica l'occhio centrale per ottenere atomi Vuoti",
  "The archive built this sentinel to test whether you understand families, not just symbols. Its core cycles through metals, halogens, and noble gases like a living table.":
    "L'archivio ha creato questa sentinella per verificare se comprendi le famiglie, non solo i simboli. Il suo nucleo alterna metalli, alogeni e gas nobili come una tavola vivente.",
  "Only the active family can damage the core": "Solo la famiglia attiva può danneggiare il nucleo",
  "Closed weak spots briefly reject shots": "I punti deboli chiusi respingono brevemente i tiri",
  "Idle too long and the E-beam vaporizes your queued atom":
    "Resta fermo troppo a lungo e l'E-beam vaporizza l'atomo in coda",
  "A singularity-bound core that hides its eye behind orbiting atoms. It does not guard a table; it bends the arena until straight-line thinking falls apart.":
    "Un nucleo legato a una singolarità che nasconde l'occhio dietro atomi orbitanti. Non protegge una tavola: piega l'arena finché il pensiero lineare crolla.",
  "The black hole bends live shots": "Il buco nero devia i tiri in volo",
  "Removed orbit atoms no longer fire back": "Gli atomi orbitanti rimossi non rispondono più al fuoco",
  "Clear the orbit, then hit the exposed eye three times":
    "Libera l'orbita, poi colpisci l'occhio esposto tre volte",
  "Obtained:": "Ottenuto:",

  "Shimmer Atom": "Atomo scintillante",
  "A glowing atom that gives 2x score and fills the Grab bar twice as fast when it merges.":
    "Un atomo luminoso che dà punteggio 2x e riempie la barra Presa due volte più velocemente quando si fonde.",
  "Unstable Atom": "Atomo instabile",
  "A rare unstable atom (4% spawn chance) shielded like electron shells: row 1 (H/He) takes 2 hits, row 2 (Li–Ne) takes 8, and everything else 16. Merge it before it decays for 2× points.":
    "Un raro atomo instabile (4% di comparsa) protetto come gusci elettronici: riga 1 (H/He) richiede 2 colpi, riga 2 (Li-Ne) ne richiede 8, tutto il resto 16. Fondilo prima che decada per punti 2x.",
  Grab: "Presa",
  "Earned after 8 consecutive merge progress. Drag one atom to reposition it and set up reactions.":
    "Ottenuto dopo 8 progressi di fusione consecutivi. Trascina un atomo per riposizionarlo e preparare reazioni.",
  "E-Gun": "E-Gun",
  "A wide straight beam that upgrades each atom it touches by 1 tier.":
    "Un ampio raggio diritto che migliora di 1 grado ogni atomo che tocca.",
  Gravity: "Gravità",
  "Pulls atoms upward and lets any newly touching matches merge immediately.":
    "Attira gli atomi verso l'alto e fa fondere subito le nuove corrispondenze a contatto.",
  Emission: "Emissione",
  "Raises every non-special atom currently waiting in your queue by 1 tier.":
    "Alza di 1 grado ogni atomo non speciale attualmente in coda.",
  "Transmute Shot": "Tiro trasmutante",
  "Rerolls the current queued atom into a higher tier. It cannot be canceled after use.":
    "Ritira l'atomo attualmente in coda trasformandolo in un grado più alto. Non può essere annullato dopo l'uso.",
  "Fusion Jump": "Salto di fusione",
  "Arms your next successful merge to skip one extra element tier.":
    "Prepara la prossima fusione riuscita a saltare un grado elementale extra.",
  "Catalyst Aura": "Aura catalizzatrice",
  "Doubles fusion radius for the next 5 shots, shown by a green ring around the loaded atom.":
    "Raddoppia il raggio di fusione per i prossimi 5 tiri, indicato da un anello verde intorno all'atomo caricato.",
  Stone: "Pietra",
  "A heavy obstacle projectile that shoves clusters and can be cracked for bonus points.":
    "Un pesante proiettile ostacolo che spinge i gruppi e può essere incrinato per punti bonus.",
  "Gamma Bomb": "Bomba gamma",
  "Arms a slow heavy projectile that clears every non-stone atom in a wide blast radius.":
    "Carica un proiettile pesante e lento che elimina ogni atomo non Pietra in un ampio raggio di esplosione.",
  Compound: "Composto",
  "Available from the start of campaign runs. Select board atoms with no more than 3 element types to form a known compound for a big bonus.":
    "Disponibile dall'inizio delle partite campagna. Seleziona atomi sulla plancia con non più di 3 tipi di elementi per formare un composto noto e ottenere un grande bonus.",
  "Blank Atom": "Atomo Vuoto",
  "A rare wildcard that copies the atom it hits, or erases a Stone completely.":
    "Un raro jolly che copia l'atomo colpito o cancella completamente una Pietra.",
  "Queue Shuffle": "Rimescola coda",
  "Recycle your queue: instantly rerolls every atom currently waiting in your queue.":
    "Ricicla la coda: ritira istantaneamente ogni atomo attualmente in attesa.",

  "Convert points into gold coins and stock your next run":
    "Converti punti in monete d'oro e prepara la prossima partita",
  "ONE-TIME UPGRADE": "POTENZIAMENTO UNA TANTUM",
  Active: "Attivo",
  Status: "Stato",
  Coins: "Monete",
  "A one-time premium upgrade for long-term progression.":
    "Un potenziamento premium una tantum per la progressione a lungo termine.",
  "Remove forced interstitial ads.": "Rimuove gli annunci interstiziali obbligatori.",
  "Unlock the Pro Lab profile badge.": "Sblocca il distintivo profilo Lab Pro.",
  "Get 50 starting gold coins.": "Ottieni 50 monete d'oro iniziali.",
  "Get +2 extra gold coins on each daily gold claim.":
    "Ottieni +2 monete d'oro extra a ogni ricompensa giornaliera.",
  "Pro Lab Pack Active": "Pacchetto Lab Pro attivo",
  "Checking...": "Controllo...",
  "Opening...": "Apertura...",
  "Preparing purchase with App Store...": "Preparazione dell'acquisto con App Store...",
  "App Store did not respond in time. Try again.":
    "L'App Store non ha risposto in tempo. Riprova.",
  "Pro Lab Pack unlocked.": "Pacchetto Lab Pro sbloccato.",
  "Pro Lab Pack is not available right now.": "Il Pacchetto Lab Pro non è disponibile al momento.",
  "App Store purchase could not be started.": "Impossibile avviare l'acquisto su App Store.",
  "Checking App Store purchases...": "Controllo degli acquisti App Store...",
  "Pro Lab Pack restored.": "Pacchetto Lab Pro ripristinato.",
  "No Pro Lab Pack purchase was found.": "Nessun acquisto del Pacchetto Lab Pro trovato.",
  "Purchases could not be restored.": "Impossibile ripristinare gli acquisti.",
  "Opening App Store purchase management...": "Apertura gestione acquisti App Store...",
  "Purchase management opened.": "Gestione acquisti aperta.",
  "No App Store management page is available yet. Use Restore to refresh purchases.":
    "Nessuna pagina di gestione App Store è ancora disponibile. Usa Ripristina per aggiornare gli acquisti.",
  "Purchase management could not be opened.": "Impossibile aprire la gestione acquisti.",
  "APP STORE COINS": "MONETE APP STORE",
  "Buy extra gold coins for power-ups and experiments. Purchases are processed securely by the App Store.":
    "Compra monete d'oro extra per potenziamenti ed esperimenti. Gli acquisti vengono elaborati in sicurezza dall'App Store.",
  "Watch rewarded ad for +1 coin": "Guarda un annuncio premio per +1 moneta",
  "Loading ad...": "Caricamento annuncio...",
  "Loading rewarded ad...": "Caricamento annuncio premio...",
  "Reward complete: +1 gold coin.": "Ricompensa completata: +1 moneta d'oro.",
  "Rewarded ad not completed or not available yet. Try again shortly.":
    "Annuncio premio non completato o non ancora disponibile. Riprova tra poco.",
  "Rewarded ad could not be started.": "Impossibile avviare l'annuncio premio.",
  "App Store coin purchase is not available right now.":
    "L'acquisto di monete App Store non è disponibile al momento.",
  "App Store coin purchase could not be started.":
    "Impossibile avviare l'acquisto di monete su App Store.",
  "added from App Store purchase.": "aggiunte dall'acquisto App Store.",
  "INVENTORY POWER-UPS": "POTENZIAMENTI INVENTARIO",
  "Stock your next run": "Prepara la prossima partita",
  "Buy extra inventory copies with gold coins. Before each level, you can choose up to 3 inventory power-ups to start with.":
    "Compra copie extra per l'inventario con monete d'oro. Prima di ogni livello puoi scegliere fino a 3 potenziamenti inventario con cui iniziare.",
  "Owned:": "Posseduti:",
  "Unlocked at level": "Sbloccato al livello",
  "Secret unlock at level": "Sblocco segreto al livello",
  "You need": "Ti servono",
  "to buy": "per comprare",
  "added to your inventory.": "aggiunto all'inventario.",
  "is introduced at level": "viene introdotto al livello",

  "COMPOUNDS": "COMPOSTI",
  Unknown: "Sconosciuto",
  "Unknown Compound": "Composto sconosciuto",
  "Found x": "Trovato x",
  Found: "Trovato",
  time: "volta",
  times: "volte",
  "elements discovered": "elementi scoperti",
  "/ 118 elements discovered": "/ 118 elementi scoperti",
  "BADGES": "DISTINTIVI",
  Unlocked: "Sbloccato",
  "Element Milestones": "Traguardi degli elementi",
  "Single landmark discoveries.": "Scoperte importanti singole.",
  "Chemical Families": "Famiglie chimiche",
  "Complete periodic-table families.": "Completa le famiglie della tavola periodica.",
  "Full Periods": "Periodi completi",
  "Discover every element in a row.": "Scopri ogni elemento di una riga.",
  "Collection Mastery": "Maestria collezione",
  "Long-term collection goals.": "Obiettivi di collezione a lungo termine.",
  "First Row": "Prima riga",
  "Discover Hydrogen and Helium.": "Scopri Idrogeno ed Elio.",
  "Noble Collector": "Collezionista nobile",
  "Discover every noble gas.": "Scopri ogni gas nobile.",
  Alchemist: "Alchimista",
  "Reach Gold.": "Raggiungi l'Oro.",
  "Radioactive Pioneer": "Pioniere radioattivo",
  "Discover Uranium.": "Scopri l'Uranio.",
  "Reactive Core": "Nucleo reattivo",
  "Discover every reactive nonmetal.": "Scopri ogni non metallo reattivo.",
  "Soft Metals": "Metalli teneri",
  "Discover every post-transition metal.": "Scopri ogni metallo post-transizione.",
  "Coinage Metals": "Metalli da conio",
  "Discover Copper, Silver, and Gold.": "Scopri Rame, Argento e Oro.",
  "Carbon Family": "Famiglia del carbonio",
  "Discover every Group 14 element.": "Scopri ogni elemento del Gruppo 14.",
  "Nitrogen Family": "Famiglia dell'azoto",
  "Discover every Group 15 element.": "Scopri ogni elemento del Gruppo 15.",
  "Oxygen Family": "Famiglia dell'ossigeno",
  "Discover every Group 16 element.": "Scopri ogni elemento del Gruppo 16.",
  "Transition Master": "Maestro di transizione",
  "Discover every transition metal.": "Scopri ogni metallo di transizione.",
  "Halogen Hunter": "Cacciatore di alogeni",
  "Discover every halogen.": "Scopri ogni alogeno.",
  "Alkali Adept": "Adepto alcalino",
  "Discover every alkali metal.": "Scopri ogni metallo alcalino.",
  "Earth Mover": "Muovi-terra",
  "Discover every alkaline earth metal.": "Scopri ogni metallo alcalino-terroso.",
  "Metalloid Mind": "Mente metalloide",
  "Discover every metalloid.": "Scopri ogni metalloide.",
  "Lanthanide Lord": "Signore dei lantanidi",
  "Discover every lanthanide.": "Scopri ogni lantanide.",
  "Actinide Archon": "Arconte degli attinidi",
  "Discover every actinide.": "Scopri ogni attinide.",
  "First Breath": "Primo respiro",
  "Discover Helium.": "Scopri l'Elio.",
  "Carbon-Based": "A base di carbonio",
  "Discover Carbon.": "Scopri il Carbonio.",
  "Iron Forge": "Forgia di ferro",
  "Discover Iron.": "Scopri il Ferro.",
  "Silver Tongue": "Lingua d'argento",
  "Discover Silver.": "Scopri l'Argento.",
  "Platinum Elite": "Elite di platino",
  "Discover Platinum.": "Scopri il Platino.",
  "Superheavy Scout": "Esploratore superpesante",
  "Discover Hassium.": "Scopri l'Hassio.",
  "Table Finisher": "Completa tavola",
  "Discover Oganesson.": "Scopri l'Oganesson.",
  "Century Club": "Club del secolo",
  "Discover 50 elements.": "Scopri 50 elementi.",
  "Periodic Master": "Maestro periodico",
  "Discover all 118 elements.": "Scopri tutti i 118 elementi.",
};

Object.assign(TRANSLATIONS.it ?? (TRANSLATIONS.it = {}), ITALIAN_TRANSLATION_EXTENSIONS);

const ITALIAN_SCIENCE_TRANSLATIONS: TranslationMap = {
  "Full Period 2": "Periodo 2 completo",
  "Full Period 3": "Periodo 3 completo",
  "Full Period 4": "Periodo 4 completo",
  "Full Period 5": "Periodo 5 completo",
  "Full Period 6": "Periodo 6 completo",
  "Full Period 7": "Periodo 7 completo",
  "Discover every Period 2 element.": "Scopri ogni elemento del Periodo 2.",
  "Discover every Period 3 element.": "Scopri ogni elemento del Periodo 3.",
  "Discover every Period 4 element.": "Scopri ogni elemento del Periodo 4.",
  "Discover every Period 5 element.": "Scopri ogni elemento del Periodo 5.",
  "Discover every Period 6 element, including lanthanides.":
    "Scopri ogni elemento del Periodo 6, inclusi i lantanidi.",
  "Discover every Period 7 element, including actinides.":
    "Scopri ogni elemento del Periodo 7, inclusi gli attinidi.",

  Hydrogen: "Idrogeno",
  Helium: "Elio",
  Lithium: "Litio",
  Beryllium: "Berillio",
  Boron: "Boro",
  Carbon: "Carbonio",
  Nitrogen: "Azoto",
  Oxygen: "Ossigeno",
  Fluorine: "Fluoro",
  Neon: "Neon",
  Sodium: "Sodio",
  Magnesium: "Magnesio",
  Aluminum: "Alluminio",
  Silicon: "Silicio",
  Phosphorus: "Fosforo",
  Sulfur: "Zolfo",
  Chlorine: "Cloro",
  Argon: "Argon",
  Potassium: "Potassio",
  Calcium: "Calcio",
  Scandium: "Scandio",
  Titanium: "Titanio",
  Vanadium: "Vanadio",
  Chromium: "Cromo",
  Manganese: "Manganese",
  Iron: "Ferro",
  Cobalt: "Cobalto",
  Nickel: "Nichel",
  Copper: "Rame",
  Zinc: "Zinco",
  Gallium: "Gallio",
  Germanium: "Germanio",
  Arsenic: "Arsenico",
  Selenium: "Selenio",
  Bromine: "Bromo",
  Krypton: "Cripton",
  Rubidium: "Rubidio",
  Strontium: "Stronzio",
  Yttrium: "Ittrio",
  Zirconium: "Zirconio",
  Niobium: "Niobio",
  Molybdenum: "Molibdeno",
  Technetium: "Tecnezio",
  Ruthenium: "Rutenio",
  Rhodium: "Rodio",
  Palladium: "Palladio",
  Silver: "Argento",
  Cadmium: "Cadmio",
  Indium: "Indio",
  Tin: "Stagno",
  Antimony: "Antimonio",
  Tellurium: "Tellurio",
  Iodine: "Iodio",
  Xenon: "Xeno",
  Cesium: "Cesio",
  Barium: "Bario",
  Lanthanum: "Lantanio",
  Cerium: "Cerio",
  Praseodymium: "Praseodimio",
  Neodymium: "Neodimio",
  Promethium: "Promezio",
  Samarium: "Samario",
  Europium: "Europio",
  Gadolinium: "Gadolinio",
  Terbium: "Terbio",
  Dysprosium: "Disprosio",
  Holmium: "Olmio",
  Erbium: "Erbio",
  Thulium: "Tulio",
  Ytterbium: "Itterbio",
  Lutetium: "Lutezio",
  Hafnium: "Afnio",
  Tantalum: "Tantalio",
  Tungsten: "Tungsteno",
  Rhenium: "Renio",
  Osmium: "Osmio",
  Iridium: "Iridio",
  Platinum: "Platino",
  Gold: "Oro",
  Mercury: "Mercurio",
  Thallium: "Tallio",
  Lead: "Piombo",
  Bismuth: "Bismuto",
  Polonium: "Polonio",
  Astatine: "Astato",
  Radon: "Radon",
  Francium: "Francio",
  Radium: "Radio",
  Actinium: "Attinio",
  Thorium: "Torio",
  Protactinium: "Protoattinio",
  Uranium: "Uranio",
  Neptunium: "Nettunio",
  Plutonium: "Plutonio",
  Americium: "Americio",
  Curium: "Curio",
  Berkelium: "Berkelio",
  Californium: "Californio",
  Einsteinium: "Einsteinio",
  Fermium: "Fermio",
  Mendelevium: "Mendelevio",
  Nobelium: "Nobelio",
  Lawrencium: "Laurenzio",
  Rutherfordium: "Rutherfordio",
  Dubnium: "Dubnio",
  Seaborgium: "Seaborgio",
  Bohrium: "Bohrio",
  Hassium: "Hassio",
  Meitnerium: "Meitnerio",
  Darmstadtium: "Darmstadtio",
  Roentgenium: "Roentgenio",
  Copernicium: "Copernicio",
  Nihonium: "Nihonio",
  Flerovium: "Flerovio",
  Moscovium: "Moscovio",
  Livermorium: "Livermorio",
  Tennessine: "Tennesso",
  Oganesson: "Oganesson",

  Water: "Acqua",
  "Carbon Dioxide": "Anidride carbonica",
  Ammonia: "Ammoniaca",
  Ammonium: "Ammonio",
  Methane: "Metano",
  "Sodium Chloride": "Cloruro di sodio",
  "Hydrogen Peroxide": "Perossido di idrogeno",
  Ozone: "Ozono",
  "Hydrogen Chloride": "Cloruro di idrogeno",
  "Hydrogen Cyanide": "Acido cianidrico",
  "Nitrous Oxide": "Protossido di azoto",
  "Calcium Oxide": "Ossido di calcio",
  "Silicon Dioxide": "Diossido di silicio",
  "Acetic Acid": "Acido acetico",
  "Carbon Monoxide": "Monossido di carbonio",
  "Sulfur Dioxide": "Diossido di zolfo",
  "Nitric Oxide": "Ossido nitrico",
  "Nitrogen Dioxide": "Diossido di azoto",
  "Magnesium Oxide": "Ossido di magnesio",
  "Iron Oxide": "Ossido di ferro",
  "Calcium Carbonate": "Carbonato di calcio",
  "Sodium Hydroxide": "Idrossido di sodio",
  Chloroform: "Cloroformio",
  "Hydrogen Sulfide": "Solfuro di idrogeno",
  "Sulfuric Acid": "Acido solforico",
  Methanol: "Metanolo",
  "Carbonic Acid": "Acido carbonico",
  "Chlorine Gas": "Cloro gassoso",
  "Oxygen Gas": "Ossigeno gassoso",
  "Hydrogen Gas": "Idrogeno gassoso",
  "Nitrogen Gas": "Azoto gassoso",
  "Hydrogen Fluoride": "Fluoruro di idrogeno",
  "Lithium Fluoride": "Fluoruro di litio",
  "Sodium Oxide": "Ossido di sodio",
  "Magnesium Chloride": "Cloruro di magnesio",
  "Calcium Chloride": "Cloruro di calcio",
  "Iron Sulfide": "Solfuro di ferro",
  "Sodium Sulfide": "Solfuro di sodio",
  "Silicon Carbide": "Carburo di silicio",
  "Carbon Disulfide": "Solfuro di carbonio",
  Phosphine: "Fosfina",
  "Phosphorus Trichloride": "Tricloruro di fosforo",
  "Carbon Tetrachloride": "Tetracloruro di carbonio",
  "Silicon Tetrachloride": "Tetracloruro di silicio",
  "Calcium Hydroxide": "Idrossido di calcio",
  "Nitric Acid": "Acido nitrico",
  "Sodium Carbonate": "Carbonato di sodio",
  Ethanol: "Etanolo",
  "Titanium Dioxide": "Diossido di titanio",
  "Zinc Oxide": "Ossido di zinco",
  "Aluminum Oxide": "Ossido di alluminio",
  Ethylene: "Etilene",
  Acetylene: "Acetilene",
  Formaldehyde: "Formaldeide",
  Urea: "Urea",
  "Ammonium Nitrate": "Nitrato di ammonio",
  "Potassium Chloride": "Cloruro di potassio",
  "Magnesium Sulfate": "Solfato di magnesio",
  "Calcium Sulfate": "Solfato di calcio",

  "A clear liquid that covers oceans, clouds, and cells.":
    "Un liquido trasparente che copre oceani, nuvole e cellule.",
  "An invisible gas made by breathing, fire, and fizzy drinks.":
    "Un gas invisibile prodotto da respirazione, fuoco e bevande frizzanti.",
  "A sharp-smelling gas used to make fertilizers.":
    "Un gas dall'odore pungente usato per produrre fertilizzanti.",
  "A nitrogen center surrounded by four hydrogens.":
    "Un centro di azoto circondato da quattro idrogeni.",
  "A simple fuel gas found in natural gas.": "Un semplice gas combustibile presente nel gas naturale.",
  "A familiar white crystal sprinkled on food.":
    "Un familiare cristallo bianco sparso sul cibo.",
  "A bubbling household disinfectant that releases oxygen.":
    "Un disinfettante domestico frizzante che libera ossigeno.",
  "A reactive form of oxygen that helps shield Earth high above.":
    "Una forma reattiva di ossigeno che aiuta a proteggere la Terra in alta quota.",
  "A sharp gas that becomes a powerful acid in water.":
    "Un gas pungente che in acqua diventa un acido potente.",
  "A small but dangerous molecule historically linked to bitter almonds.":
    "Una molecola piccola ma pericolosa storicamente associata alle mandorle amare.",
  "A gas famous for whipped cream chargers and laughing gas.":
    "Un gas famoso per le bombolette di panna montata e come gas esilarante.",
  "A hot-reacting powder known as quicklime.":
    "Una polvere a reazione calda nota come calce viva.",
  "The hard mineral chemistry behind quartz and sand.":
    "La chimica minerale dura dietro quarzo e sabbia.",
  "The tangy molecule that gives vinegar its bite.":
    "La molecola pungente che dà all'aceto il suo morso.",
  "A dangerous invisible gas from incomplete burning.":
    "Un gas invisibile pericoloso prodotto da combustione incompleta.",
  "A choking volcanic gas linked to smoky pollution.":
    "Un gas vulcanico soffocante collegato all'inquinamento fumoso.",
  "A tiny signaling gas used by the body.": "Un minuscolo gas di segnalazione usato dal corpo.",
  "A reddish-brown gas seen in polluted air.":
    "Un gas rosso-bruno visibile nell'aria inquinata.",
  "A white mineral made when magnesium burns brightly.":
    "Un minerale bianco che si forma quando il magnesio brucia intensamente.",
  "The red-brown chemistry of rust and earthy pigments.":
    "La chimica rosso-bruna della ruggine e dei pigmenti terrosi.",
  "A chalky solid found in shells, limestone, and pearls.":
    "Un solido gessoso presente in conchiglie, calcare e perle.",
  "A slippery, caustic base used in soap making.":
    "Una base scivolosa e caustica usata per fare il sapone.",
  "A heavy sweet-smelling liquid with three halogen atoms.":
    "Un liquido pesante dall'odore dolciastro con tre atomi di alogeno.",
  "A foul-smelling gas associated with rotten eggs.":
    "Un gas maleodorante associato alle uova marce.",
  "A heavy industrial acid used around the world.":
    "Un acido industriale pesante usato in tutto il mondo.",
  "A small alcohol used as fuel and solvent.": "Un piccolo alcol usato come carburante e solvente.",
  "The weak acid that appears when bubbles meet water.":
    "L'acido debole che appare quando le bolle incontrano l'acqua.",
  "A greenish disinfecting gas with a harsh smell.":
    "Un gas disinfettante verdastro dall'odore acre.",
  "The breathable gas cells use to release energy.":
    "Il gas respirabile che le cellule usano per liberare energia.",
  "The lightest gas, often used in rockets and fuel cells.":
    "Il gas più leggero, spesso usato nei razzi e nelle celle a combustibile.",
  "The quiet main ingredient of the air around you.":
    "Il principale ingrediente silenzioso dell'aria intorno a te.",
  "A familiar substance waiting to be discovered.":
    "Una sostanza familiare in attesa di essere scoperta.",
};

Object.assign(TRANSLATIONS.it ?? (TRANSLATIONS.it = {}), ITALIAN_SCIENCE_TRANSLATIONS);

for (const [language, translations] of Object.entries(GLOBAL_TRANSLATION_EXTENSIONS) as Array<
  [AppLanguage, TranslationMap]
>) {
  Object.assign(TRANSLATIONS[language] ?? (TRANSLATIONS[language] = {}), translations);
}
