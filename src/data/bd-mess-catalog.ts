/**
 * Bangladesh Mess — Full Market Catalog (Bangladesh-first)
 * Used as:
 *  - global template (messId IS NULL) seeded via drizzle 0004
 *  - per-mess copy on POST /api/messes (keeps existing pattern, but now ~100 products)
 * Each entry has a-prepared `slug` (a-z0-9, unique per scope) so Bangla names don't collapse to "".
 */
export type CatalogCategory = { slug: string; name: string; sortOrder: number };
export type CatalogProduct = { slug: string; name: string; categorySlug: string; defaultUnit: Unit };
export type Unit = "kg" | "gram" | "litre" | "ml" | "piece" | "dozen" | "packet" | "bottle" | "box" | "custom";

export const BD_CATEGORIES: CatalogCategory[] = [
  { slug: "chal", name: "চাল", sortOrder: 0 },
  { slug: "dal", name: "ডাল", sortOrder: 1 },
  { slug: "ata-moyda", name: "আটা/ময়দা", sortOrder: 2 },
  { slug: "mach", name: "মাছ", sortOrder: 3 },
  { slug: "mangsho", name: "মাংস", sortOrder: 4 },
  { slug: "dim", name: "ডিম", sortOrder: 5 },
  { slug: "shobji", name: "সবজি", sortOrder: 6 },
  { slug: "alu-peyaj-roshun-ada", name: "আলু/পেঁয়াজ/রসুন/আদা", sortOrder: 7 },
  { slug: "moshla", name: "মসলা", sortOrder: 8 },
  { slug: "tel-ghee", name: "তেল/ঘি", sortOrder: 9 },
  { slug: "dudh-doi", name: "দুধ/দই", sortOrder: 10 },
  { slug: "lobon-chini-cha", name: "লবণ/চিনি/চা", sortOrder: 11 },
  { slug: "onnanno", name: "অন্যান্য", sortOrder: 12 },
];

export const BD_PRODUCTS: CatalogProduct[] = [
  // চাল (kg)
  { slug: "chal-miniket", name: "মিনিকেট চাল", categorySlug: "chal", defaultUnit: "kg" },
  { slug: "chal-nazirshail", name: "নাজিরশাইল চাল", categorySlug: "chal", defaultUnit: "kg" },
  { slug: "chal-bashmoti", name: "বাসমতী চাল", categorySlug: "chal", defaultUnit: "kg" },
  { slug: "chal-atop", name: "আটপ চাল", categorySlug: "chal", defaultUnit: "kg" },
  { slug: "chal-mota", name: "মোটা চাল", categorySlug: "chal", defaultUnit: "kg" },
  // ডাল
  { slug: "dal-moshur", name: "মসুর ডাল", categorySlug: "dal", defaultUnit: "kg" },
  { slug: "dal-mug", name: "মুগ ডাল", categorySlug: "dal", defaultUnit: "kg" },
  { slug: "dal-kheshari", name: "খেসারি ডাল", categorySlug: "dal", defaultUnit: "kg" },
  { slug: "dal-chola", name: "ছোলা", categorySlug: "dal", defaultUnit: "kg" },
  { slug: "dal-motor", name: "মটর ডাল", categorySlug: "dal", defaultUnit: "kg" },
  // আটা/ময়দা
  { slug: "ata", name: "আটা", categorySlug: "ata-moyda", defaultUnit: "kg" },
  { slug: "moyda", name: "ময়দা", categorySlug: "ata-moyda", defaultUnit: "kg" },
  { slug: "shuji", name: "সুজি", categorySlug: "ata-moyda", defaultUnit: "kg" },
  { slug: "beshon", name: "বেসন", categorySlug: "ata-moyda", defaultUnit: "kg" },
  { slug: "chira", name: "চিড়া", categorySlug: "ata-moyda", defaultUnit: "kg" },
  { slug: "muri", name: "মুড়ি", categorySlug: "ata-moyda", defaultUnit: "kg" },
  // মাছ
  { slug: "mach-ilish", name: "ইলিশ", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-rui", name: "রুই", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-katla", name: "কাতলা", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-pangash", name: "পাঙ্গাশ", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-telapia", name: "তেলাপিয়া", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-chingri", name: "চিংড়ি", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-koi", name: "কৈ", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-shing", name: "শিং/মাগুর", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-boal", name: "বোয়াল", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-sorputi", name: "সরপুঁটি", categorySlug: "mach", defaultUnit: "kg" },
  { slug: "mach-shutki", name: "শুঁটকি", categorySlug: "mach", defaultUnit: "kg" },
  // মাংস
  { slug: "mangsho-goru", name: "গরুর মাংস", categorySlug: "mangsho", defaultUnit: "kg" },
  { slug: "mangsho-khashi", name: "খাসির মাংস", categorySlug: "mangsho", defaultUnit: "kg" },
  { slug: "mangsho-murgi-farm", name: "মুরগি (ফার্ম)", categorySlug: "mangsho", defaultUnit: "kg" },
  { slug: "mangsho-murgi-deshi", name: "মুরগি (দেশি)", categorySlug: "mangsho", defaultUnit: "kg" },
  { slug: "mangsho-hash", name: "হাঁস", categorySlug: "mangsho", defaultUnit: "kg" },
  // ডিম
  { slug: "dim-murgi", name: "ডিম (মুরগি)", categorySlug: "dim", defaultUnit: "piece" },
  { slug: "dim-hash", name: "ডিম (হাঁস)", categorySlug: "dim", defaultUnit: "piece" },
  // সবজি
  { slug: "shobji-begun", name: "বেগুন", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-tomato", name: "টমেটো", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-fulkopi", name: "ফুলকপি", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-badhakopi", name: "বাঁধাকপি", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-lau", name: "লাউ", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-kumra-mishti", name: "মিষ্টি কুমড়া", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-kumra-chal", name: "চাল কুমড়া", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-potol", name: "পটল", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-dherosh", name: "ঢেঁড়স", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-korola", name: "করলা", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-shosha", name: "শসা", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-gajor", name: "গাজর", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-mula", name: "মুলা", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-borboti", name: "বরবটি", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-pui-shak", name: "পুঁই শাক", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-lal-shak", name: "লাল শাক", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-palong-shak", name: "পালং শাক", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-kolmi-shak", name: "কলমি শাক", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-data", name: "ডাঁটা", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-dhonepata", name: "ধনেপাতা", categorySlug: "shobji", defaultUnit: "gram" },
  { slug: "shobji-kancha-morich", name: "কাঁচা মরিচ", categorySlug: "shobji", defaultUnit: "gram" },
  { slug: "shobji-lebu", name: "লেবু", categorySlug: "shobji", defaultUnit: "piece" },
  { slug: "shobji-kochur-mukhi", name: "কচুর মুখি", categorySlug: "shobji", defaultUnit: "kg" },
  { slug: "shobji-pepe", name: "পেঁপে", categorySlug: "shobji", defaultUnit: "kg" },
  // আলু/পেঁয়াজ/রসুন/আদা
  { slug: "alu", name: "আলু", categorySlug: "alu-peyaj-roshun-ada", defaultUnit: "kg" },
  { slug: "peyaj", name: "পেঁয়াজ", categorySlug: "alu-peyaj-roshun-ada", defaultUnit: "kg" },
  { slug: "roshun", name: "রসুন", categorySlug: "alu-peyaj-roshun-ada", defaultUnit: "kg" },
  { slug: "ada", name: "আদা", categorySlug: "alu-peyaj-roshun-ada", defaultUnit: "kg" },
  { slug: "kochur-loti", name: "কচুর লতি", categorySlug: "alu-peyaj-roshun-ada", defaultUnit: "kg" },
  // মসলা
  { slug: "moshla-holud", name: "হলুদ গুঁড়া", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-morich-gura", name: "মরিচ গুঁড়া", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-dhoniya", name: "ধনিয়া গুঁড়া", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-jira", name: "জিরা", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-gorom-moshla", name: "গরম মসলা", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-tejpata", name: "তেজপাতা", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-daruchini", name: "দারুচিনি", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-elach", name: "এলাচ", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-lobongo", name: "লবঙ্গ", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-golmorich", name: "গোলমরিচ", categorySlug: "moshla", defaultUnit: "gram" },
  { slug: "moshla-shorisha-bata", name: "সরিষা বাটা", categorySlug: "moshla", defaultUnit: "gram" },
  // তেল/ঘি
  { slug: "tel-soyabin", name: "সয়াবিন তেল", categorySlug: "tel-ghee", defaultUnit: "litre" },
  { slug: "tel-shorisha", name: "সরিষার তেল", categorySlug: "tel-ghee", defaultUnit: "litre" },
  { slug: "tel-canola", name: "ক্যানোলা তেল", categorySlug: "tel-ghee", defaultUnit: "litre" },
  { slug: "ghee", name: "ঘি", categorySlug: "tel-ghee", defaultUnit: "gram" },
  // দুধ/দই
  { slug: "dudh", name: "দুধ", categorySlug: "dudh-doi", defaultUnit: "litre" },
  { slug: "doi", name: "দই", categorySlug: "dudh-doi", defaultUnit: "kg" },
  { slug: "dim-tokdoi", name: "টকদই", categorySlug: "dudh-doi", defaultUnit: "kg" },
  // লবণ/চিনি/চা
  { slug: "lobon", name: "লবণ", categorySlug: "lobon-chini-cha", defaultUnit: "kg" },
  { slug: "chini", name: "চিনি", categorySlug: "lobon-chini-cha", defaultUnit: "kg" },
  { slug: "cha-pata", name: "চা পাতা", categorySlug: "lobon-chini-cha", defaultUnit: "gram" },
  { slug: "gur", name: "গুড়", categorySlug: "lobon-chini-cha", defaultUnit: "kg" },
  { slug: "biscuit", name: "বিস্কুট", categorySlug: "lobon-chini-cha", defaultUnit: "packet" },
  { slug: "chanachur", name: "চানাচুর", categorySlug: "lobon-chini-cha", defaultUnit: "packet" },
  // অন্যান্য — gas/non-food ইচ্ছা করলে এখানে যোগ হবে, classification আলাদা
  { slug: "pani-jar", name: "পানি জার", categorySlug: "onnanno", defaultUnit: "piece" },
  { slug: "tissue", name: "টিস্যু", categorySlug: "onnanno", defaultUnit: "packet" },
];
