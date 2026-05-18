import { Character } from './types';

export const FIXED_CHARACTERS: Character[] = [
  // Cultural & Regional Characters
  {
    id: "sheikh-wise",
    name: "Sheikh Wise",
    nameAr: "الشيخ الحكيم",
    role: "حكيم / مستشار",
    description: "رجل مسن ذو لحية بيضاء كفييفة وملابس تقليدية رصينة. يتحدث بحكمة عميقة وصوت هادئ وموزون.",
    avatar: "https://images.unsplash.com/photo-1542103749-8ef59b94f4b3?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
  },
  {
    id: "bedouin-warrior",
    name: "Bedouin Warrior",
    nameAr: "الفارس البدوي",
    role: "فارس صحراوي",
    description: "رجل صحراوي ذو ملامح حادة وبشرة لفحتها الشمس، يرتدي العمامة العربية التقليدية. صوت قوي وخشن.",
    avatar: "https://images.unsplash.com/photo-1510279543168-5e7836b2848c?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
  },
  {
    id: "nabati-poetess",
    name: "Nabati Poetess",
    nameAr: "شاعرة النبط",
    role: "شاعرة / أديبة",
    description: "امرأة أنيقة ذات ملامح راقية، متخصصة في الشعر النبطي. صوت أنثوي ناعم وبليغ.",
    avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
  },
  {
    id: "middle-eastern-man", 
    name: "Modern Arab Man", 
    nameAr: "شاب عصري", 
    role: "مهني محترف", 
    description: "شاب عربي بمظهر مهني عصري، ملامح واضحة ونظرة واثقة. صوت مصقول ولبق.",
    avatar: "https://images.unsplash.com/photo-1540569014015-19a7ee504e3a?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
    preferredVoice: "egyptian",
    preferredDialect: "egyptian"
  },
  { 
    id: "middle-eastern-woman", 
    name: "Arab Woman", 
    nameAr: "فتاة عربية", 
    role: "رائدة شبابية", 
    description: "فتاة عربية جميلة ذات عيون معبرة وصوت ودود وناعم.", 
    avatar: "https://images.unsplash.com/photo-1510154221590-ff63e90a136f?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
    preferredVoice: "syrian",
    preferredDialect: "syrian"
  },
  {
    id: "realistic-girl",
    name: "Arabic Girl",
    nameAr: "بنت عربية",
    role: "شخصية رئيسية",
    description: "طفلة عربية بملامح بريئة وعيون واسعة، ترتدي ملابس ملونة زاهية. تعبر عن الفرح والفضول.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic"
  },
  {
    id: "realistic-young-man",
    name: "Arab Young Man",
    nameAr: "شاب عربي",
    role: "بطل القصة",
    description: "شاب عربي في العشرينات بملامح حادة ومظهر عصري وأنيق. يمتلك نظرة واثقة وصوت قوي.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic",
    preferredVoice: "syrian",
    preferredDialect: "syrian"
  },
  {
    id: "realistic-child",
    name: "Arab Child",
    nameAr: "طفل عربي",
    role: "شخصية مساعدة",
    description: "طفل صغير مرح ذو شعر مبعثر وابتسامة دافئة. يمثل البراءة والمغامرة في الصحراء.",
    avatar: "https://images.unsplash.com/photo-1519238263530-99bdd1102f00?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic"
  },
  {
    id: "realistic-old-man",
    name: "Old Sheikh",
    nameAr: "شيخ وقور",
    role: "موجه / قدوة",
    description: "رجل مسن بمظهر وقور ولحية رمادية، يرتدي العباءة التقليدية. ملامحه تعكس خبرة السنين والحكمة.",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300&h=300",
    style: "realistic"
  },
  { 
    id: 'cartoon-boy', 
    name: 'Cartoon Boy', 
    nameAr: 'نصور (كرتون)', 
    role: 'بطل القصة', 
    description: 'ولد كرتوني لطيف بعيون واسعة ومعبرة ملابس مستقبلية زاهية. لمسة ديزني عربية.', 
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200',
    style: 'cartoon'
  },
  { 
    id: 'cartoon-girl', 
    name: 'Cartoon Girl', 
    nameAr: 'لولو (كرتون)', 
    role: 'شخصية مرحة', 
    description: 'بنت كرتونية مرحة بألوان زاهية وتصميم جذاب يناسب قصص الأطفال.', 
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200',
    style: 'cartoon'
  },
  { 
    id: 'cartoon-old-man', 
    name: 'Cartoon Old Man', 
    nameAr: 'جدو حكيم (كرتون)', 
    role: 'جد / حكيم', 
    description: 'رجل مسن كرتوني ملامح مبالغ فيها وحبة، يمثل الحكمة والمرح في آن واحد.', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
    style: 'cartoon'
  }
];

export const VISUAL_FILTERS = [
  { id: 'none', name: 'الأصلي', class: '' },
  { id: 'sepia', name: 'تاريخي (سيبيا)', class: 'sepia-[0.6] contrast-[1.1]' },
  { id: 'bw', name: 'أبيض وأسود', class: 'grayscale' },
  { id: 'vintage', name: 'عتيق (السبعينات)', class: 'sepia-[0.3] brightness-[1.1] contrast-[0.9] saturate-[0.8]' },
  { id: 'cinematic', name: 'سينمائي احترافي', class: 'hue-rotate-[10deg] saturate-[1.2] contrast-[1.1]' },
  { id: 'noir', name: 'ظلال معتمة', class: 'grayscale brightness-[0.7] contrast-[1.5]' },
  { id: 'vibrant', name: 'ألوان حيوية', class: 'saturate-[1.8] brightness-[1.1]' },
] as const;
