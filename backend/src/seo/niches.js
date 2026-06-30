/**
 * Каталог ниш для programmatic SEO.
 * slugBase — часть URL (crm-dlya-{slugBase}, online-zapis-dlya-{slugBase})
 * genitive — «для кого»: салона красоты, барбершопа
 * bookingNa/V/K — паттерны «на / в / к»
 */
function niche(id, slugBase, genitive, opts = {}) {
  return {
    id,
    slugBase,
    genitive,
    category: opts.category || 'beauty',
    bookingNa: opts.bookingNa || null,
    bookingV: opts.bookingV || null,
    bookingK: opts.bookingK || null,
  };
}

const NICHE_CATALOG = [
  niche('salon-krasoty', 'salona-krasoty', 'салона красоты', {
    category: 'beauty',
    bookingNa: { slug: 'manikyur', label: 'маникюр' },
    bookingV: { slug: 'salon-krasoty', label: 'салон красоты' },
  }),
  niche('barbershop', 'barbershopa', 'барбершопа', {
    category: 'beauty',
    bookingNa: { slug: 'strizhku', label: 'стрижку' },
    bookingV: { slug: 'barbershop', label: 'барбершоп' },
  }),
  niche('parikmakherskaya', 'parikmakherskoj', 'парикмахерской', {
    category: 'beauty',
    bookingNa: { slug: 'strizhku', label: 'стрижку' },
    bookingV: { slug: 'parikmakherskuyu', label: 'парикмахерскую' },
  }),
  niche('kosmetolog', 'kosmetologa', 'косметолога', {
    category: 'beauty',
    bookingNa: { slug: 'chistku-lica', label: 'чистку лица' },
    bookingK: { slug: 'kosmetologu', label: 'косметологу' },
  }),
  niche('manikyur', 'manikyura', 'мастера маникюра', {
    category: 'beauty',
    bookingNa: { slug: 'manikyur', label: 'маникюр' },
    bookingK: { slug: 'masteru-manikyura', label: 'мастеру маникюра' },
  }),
  niche('pedikyur', 'pedikyura', 'мастера педикюра', {
    category: 'beauty',
    bookingNa: { slug: 'pedikyur', label: 'педикюр' },
  }),
  niche('brovist', 'brovista', 'бровиста', {
    category: 'beauty',
    bookingNa: { slug: 'korrekciyu-brovey', label: 'коррекцию бровей' },
    bookingK: { slug: 'brovistu', label: 'бровисту' },
  }),
  niche('lashmaker', 'lashmejkera', 'лэшмейкера', {
    category: 'beauty',
    bookingNa: { slug: 'narashchivanie-resnic', label: 'наращивание ресниц' },
  }),
  niche('vizazhist', 'vizazhista', 'визажиста', {
    category: 'beauty',
    bookingNa: { slug: 'makiyazh', label: 'макияж' },
  }),
  niche('massazhist', 'massazhista', 'массажиста', {
    category: 'beauty',
    bookingNa: { slug: 'massazh', label: 'массаж' },
    bookingK: { slug: 'massazhistu', label: 'массажисту' },
  }),
  niche('spa', 'spa-salona', 'СПА-салона', {
    category: 'beauty',
    bookingV: { slug: 'spa-salon', label: 'СПА-салон' },
  }),
  niche('solyariy', 'solyariya', 'солярия', {
    category: 'beauty',
    bookingNa: { slug: 'zagar', label: 'загар' },
  }),
  niche('tattoo', 'tattoo-studii', 'тату-студии', {
    category: 'beauty',
    bookingNa: { slug: 'tatu', label: 'тату' },
  }),
  niche('permanent', 'permanentnogo-makiyazha', 'перманентного макияжа', {
    category: 'beauty',
    bookingNa: { slug: 'permanent', label: 'перманент' },
  }),
  niche('nail-studio', 'nail-studii', 'nail-студии', {
    category: 'beauty',
    bookingNa: { slug: 'manikyur', label: 'маникюр' },
  }),
  niche('epilyaciya', 'studii-epilyacii', 'студии эпиляции', {
    category: 'beauty',
    bookingNa: { slug: 'epilyaciyu', label: 'эпиляцию' },
  }),
  niche('brow-bar', 'brow-bara', 'бров-бара', { category: 'beauty' }),

  niche('stomatologiya', 'stomatologii', 'стоматологии', {
    category: 'medical',
    bookingNa: { slug: 'lechenie-zubov', label: 'лечение зубов' },
    bookingK: { slug: 'stomatologu', label: 'стоматологу' },
  }),
  niche('klinika', 'kliniki', 'клиники', {
    category: 'medical',
    bookingV: { slug: 'kliniku', label: 'клинику' },
  }),
  niche('medcentre', 'medcentra', 'медцентра', { category: 'medical' }),
  niche('vrach', 'chastnogo-vracha', 'частного врача', {
    category: 'medical',
    bookingK: { slug: 'vrachu', label: 'врачу' },
  }),
  niche('psiholog', 'psihologa', 'психолога', {
    category: 'medical',
    bookingK: { slug: 'psihologu', label: 'психологу' },
  }),
  niche('veterinar', 'veterinarnoj-kliniki', 'ветеринарной клиники', { category: 'medical' }),

  niche('repetitor', 'repetitora', 'репетитора', {
    category: 'education',
    bookingK: { slug: 'repetitoru', label: 'репетитору' },
  }),
  niche('yazykovaya-shkola', 'yazykovoj-shkoly', 'языковой школы', { category: 'education' }),
  niche('detskiy-centr', 'detskogo-centra', 'детского центра', { category: 'education' }),
  niche('muzykalnaya-shkola', 'muzykalnoj-shkoly', 'музыкальной школы', { category: 'education' }),
  niche('avtoshkola', 'avtoshkoly', 'автошколы', { category: 'education' }),

  niche('fitnes-trener', 'fitnes-trenera', 'фитнес-тренера', {
    category: 'fitness',
    bookingK: { slug: 'fitnes-treneru', label: 'фитнес-тренеру' },
    bookingNa: { slug: 'trenirovku', label: 'тренировку' },
  }),
  niche('yoga', 'yoga-studii', 'йога-студии', {
    category: 'fitness',
    bookingNa: { slug: 'yogu', label: 'йогу' },
  }),
  niche('tancevalnaya', 'tancevalnoj-studii', 'танцевальной студии', { category: 'fitness' }),
  niche('sportzal', 'sportivnogo-zala', 'спортивного зала', { category: 'fitness' }),
  niche('basseyn', 'bassejna', 'бассейна', { category: 'fitness' }),

  niche('fotograf', 'fotografa', 'фотографа', {
    category: 'services',
    bookingNa: { slug: 'fotosessiyu', label: 'фотосессию' },
  }),
  niche('yurist', 'yurista', 'юриста', {
    category: 'services',
    bookingK: { slug: 'yuristu', label: 'юристу' },
  }),
  niche('klining', 'kliningovoj-kompanii', 'клининговой компании', { category: 'services' }),
  niche('remont-tehniki', 'servisa-remonta-tehniki', 'сервиса ремонта техники', { category: 'services' }),
  niche('koach', 'koacha', 'коуча', { category: 'services' }),
  niche('konsultant', 'konsultanta', 'консультанта', { category: 'services' }),
  niche('event', 'event-agentstva', 'event-агентства', { category: 'services' }),
  niche('gruming', 'gruming-salona', 'груминг-салона', { category: 'services' }),
];

module.exports = { NICHE_CATALOG };
