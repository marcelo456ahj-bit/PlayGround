(function () {
  'use strict';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (seed) => {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const T = (name, short, city, c1, c2, c3, stadium, rating) => ({ name, short, city, c1, c2, c3, stadium, rating });

  const LEAGUE_DEFS = [
    {
      id: 'brasileirao', name: 'Brasileirão Série A', country: 'Brasil', flag: 'BRA', region: 'southamerica', confed: 'CONMEBOL',
      desc: 'A elite do futebol brasileiro em 38 rodadas de pura técnica.',
      teams: [
        T('Rio Rubro', 'RUB', 'Rio de Janeiro', '#c8102e', '#111111', '#ffffff', 'Arena Guanabara', 87),
        T('Verdão Paulista', 'VER', 'São Paulo', '#0a7a3d', '#ffffff', '#c9ff3d', 'Allianz Paulista', 85),
        T('São Paulo Tricolor', 'SPT', 'São Paulo', '#c8102e', '#111111', '#ffffff', 'Morumbi Arena', 84),
        T('Bairro Preto', 'BPR', 'São Paulo', '#111111', '#ffffff', '#c9ff3d', 'Arena do Povo', 84),
        T('Santos Litoral', 'STL', 'Santos', '#f4f7fa', '#111111', '#35e6ff', 'Vila do Peixe', 82),
        T('Grêmio Sul', 'GRS', 'Porto Alegre', '#1b5fae', '#111111', '#35e6ff', 'Arena do Sul', 83),
        T('Inter Sul', 'INS', 'Porto Alegre', '#c8102e', '#ffffff', '#c9ff3d', 'Beira do Rio', 83),
        T('Cruzeiro Azul', 'CRU', 'Belo Horizonte', '#1b3fa8', '#ffffff', '#35e6ff', 'Arena Mineirão', 81),
        T('Galo Mineiro', 'GAL', 'Belo Horizonte', '#151515', '#ffffff', '#c9ff3d', 'Arena Independência', 84),
        T('Bahia Tricolor', 'BAT', 'Salvador', '#1b5fae', '#c8102e', '#ffffff', 'Arena Todos-os-Santos', 79),
        T('Sport Recife', 'SPR', 'Recife', '#c8102e', '#111111', '#ffffff', 'Arena do Recife', 77),
        T('Fortaleza Leão', 'FLE', 'Fortaleza', '#1b5fae', '#c8102e', '#ffffff', 'Castelo Arena', 79),
        T('Ceará Alvinegro', 'CEA', 'Fortaleza', '#111111', '#ffffff', '#c9ff3d', 'Arena do Ceará', 76),
        T('Furacão Paraná', 'FUP', 'Curitiba', '#c8102e', '#111111', '#ffffff', 'Arena do Furacão', 80),
        T('Coxa Verde', 'COX', 'Curitiba', '#0a7a3d', '#ffffff', '#c9ff3d', 'Arena Coxa', 75),
        T('Colina Cruz', 'COL', 'Rio de Janeiro', '#111111', '#ffffff', '#c9ff3d', 'Arena Colina', 78),
        T('Tricolor Carioca', 'TRC', 'Rio de Janeiro', '#0a7a3d', '#c8102e', '#ffffff', 'Arena das Laranjeiras', 80),
        T('Estrela Solitária', 'ESS', 'Rio de Janeiro', '#111111', '#ffffff', '#35e6ff', 'Arena Estrela', 81),
        T('Vitória Rubro', 'VIT', 'Salvador', '#c8102e', '#111111', '#ffffff', 'Arena Barradão', 75),
        T('Juventude Sul', 'JUV', 'Caxias do Sul', '#0a7a3d', '#ffffff', '#c9ff3d', 'Arena da Serra', 73)
      ]
    },
    {
      id: 'premier', name: 'Premier League', country: 'Inglaterra', flag: 'ENG', region: 'europe', confed: 'UEFA',
      desc: 'Intensidade, velocidade e estádios lotados. A liga mais assistida do planeta.',
      teams: [
        T('Manchester Red', 'MNR', 'Manchester', '#c8102e', '#ffffff', '#111111', 'Theatre Arena', 88),
        T('Manchester Sky', 'MNS', 'Manchester', '#6ec6e8', '#ffffff', '#1b3fa8', 'Arena of Manchester', 89),
        T('Liverpool Mersey', 'LIV', 'Liverpool', '#c8102e', '#ffffff', '#21ef92', 'Anfield Park', 88),
        T('London Blue', 'LON', 'Londres', '#1b3fa8', '#ffffff', '#35e6ff', 'Bridge Arena', 86),
        T('North London Red', 'NLR', 'Londres', '#c8102e', '#ffffff', '#c9ff3d', 'Emirates Arena', 86),
        T('North London White', 'NLW', 'Londres', '#f4f7fa', '#1b2a4a', '#ff3d82', 'Lilywhite Arena', 85),
        T('Newcastle Magpie', 'NEW', 'Newcastle', '#111111', '#ffffff', '#35e6ff', 'St James Arena', 83),
        T('Birmingham Claret', 'BIR', 'Birmingham', '#7a1e3c', '#6ec6e8', '#ffffff', 'Villa Arena', 82),
        T('Brighton Seagull', 'BRI', 'Brighton', '#1b5fae', '#ffffff', '#c9ff3d', 'Coast Arena', 80),
        T('London Hammers', 'LHA', 'Londres', '#7a1e3c', '#6ec6e8', '#ffffff', 'Olympic Arena', 81),
        T('Liverpool Blues', 'LVB', 'Liverpool', '#1b3fa8', '#ffffff', '#35e6ff', 'Goodison Arena', 80),
        T('South London Eagles', 'SLE', 'Londres', '#1b5fae', '#c8102e', '#ffffff', 'Selhurst Arena', 79),
        T('Wolves Gold', 'WOL', 'Wolverhampton', '#f5b324', '#111111', '#ffffff', 'Molineux Arena', 78),
        T('Leicester Fox', 'LEI', 'Leicester', '#1b3fa8', '#ffffff', '#f5b324', 'Fox Arena', 79),
        T('Leeds White', 'LEE', 'Leeds', '#f4f7fa', '#1b3fa8', '#f5b324', 'Elland Arena', 77),
        T('Southampton Saint', 'SOU', 'Southampton', '#c8102e', '#ffffff', '#111111', 'St Mary Arena', 76),
        T('Nottingham Forest', 'NOT', 'Nottingham', '#c8102e', '#ffffff', '#0a7a3d', 'City Ground', 77),
        T('Bournemouth Cherry', 'BOU', 'Bournemouth', '#c8102e', '#111111', '#ffffff', 'Vitality Arena', 76),
        T('Brentford Bee', 'BRE', 'Londres', '#c8102e', '#ffffff', '#f5b324', 'Community Arena', 77),
        T('West London Whites', 'WLW', 'Londres', '#f4f7fa', '#111111', '#35e6ff', 'Cottage Arena', 75)
      ]
    },
    {
      id: 'laliga', name: 'LaLiga', country: 'Espanha', flag: 'ESP', region: 'europe', confed: 'UEFA',
      desc: 'Toque de bola, rivalidade e o clássico mais visto do mundo.',
      teams: [
        T('Madrid Blanco', 'MAD', 'Madri', '#f4f7fa', '#d4af37', '#35e6ff', 'Santiago Arena', 90),
        T('Barcelona Blaugrana', 'BAR', 'Barcelona', '#1b3fa8', '#a50044', '#f5b324', 'Camp Arena', 89),
        T('Madrid Rojiblanco', 'ATL', 'Madri', '#c8102e', '#ffffff', '#1b3fa8', 'Metropolitano Arena', 86),
        T('Sevilla Rojo', 'SEV', 'Sevilha', '#c8102e', '#ffffff', '#111111', 'Sánchez Arena', 82),
        T('Valencia Naranja', 'VAL', 'Valência', '#f4f7fa', '#f5b324', '#111111', 'Mestalla Arena', 80),
        T('Bilbao León', 'BIL', 'Bilbao', '#c8102e', '#ffffff', '#111111', 'San Mamés Arena', 81),
        T('San Sebastián Azul', 'SSA', 'San Sebastián', '#1b5fae', '#ffffff', '#35e6ff', 'Anoeta Arena', 81),
        T('Villarreal Amarillo', 'VIL', 'Villarreal', '#f5b324', '#1b3fa8', '#ffffff', 'La Cerámica', 81),
        T('Betis Verde', 'BET', 'Sevilha', '#0a7a3d', '#ffffff', '#c9ff3d', 'Benito Arena', 80),
        T('Girona Rojo', 'GIR', 'Girona', '#c8102e', '#ffffff', '#111111', 'Montilivi Arena', 78),
        T('Celta Céu', 'CEL', 'Vigo', '#6ec6e8', '#ffffff', '#1b3fa8', 'Balaídos Arena', 77),
        T('Osasuna Rojo', 'OSA', 'Pamplona', '#c8102e', '#1b2a4a', '#ffffff', 'El Sadar Arena', 76),
        T('Rayo Vallecano', 'RAY', 'Madri', '#f4f7fa', '#c8102e', '#ff3d82', 'Vallecas Arena', 76),
        T('Mallorca Bermellón', 'MLL', 'Palma', '#c8102e', '#111111', '#ffffff', 'Son Moix Arena', 76),
        T('Getafe Azul', 'GET', 'Getafe', '#1b3fa8', '#ffffff', '#35e6ff', 'Coliseum Arena', 75),
        T('Alavés Azul', 'ALA', 'Vitória', '#1b3fa8', '#ffffff', '#c9ff3d', 'Mendizorroza Arena', 74),
        T('Espanyol Periquito', 'ESP', 'Barcelona', '#1b5fae', '#ffffff', '#ff3d82', 'RCDE Arena', 75),
        T('Las Palmas Amarillo', 'LPA', 'Las Palmas', '#f5b324', '#1b3fa8', '#ffffff', 'Gran Canaria Arena', 74),
        T('Valladolid Pucela', 'VLL', 'Valladolid', '#6b2d8b', '#ffffff', '#c9ff3d', 'Zorrilla Arena', 73),
        T('Huesca Azulgrana', 'HUE', 'Huesca', '#1b3fa8', '#c8102e', '#ffffff', 'El Alcoraz Arena', 72)
      ]
    },
    {
      id: 'seriea', name: 'Serie A', country: 'Itália', flag: 'ITA', region: 'europe', confed: 'UEFA',
      desc: 'A escola italiana da defesa: tática, catenaccio e contra-ataques letais.',
      teams: [
        T('Milano Nerazzurro', 'MIL', 'Milão', '#1b3fa8', '#111111', '#ffffff', 'San Siro Arena', 89),
        T('Milano Rossonero', 'MIR', 'Milão', '#c8102e', '#111111', '#ffffff', 'San Siro Arena', 88),
        T('Torino Bianconero', 'TOR', 'Turim', '#111111', '#ffffff', '#c9ff3d', 'Allianz Torino', 89),
        T('Napoli Vesúvio', 'NAP', 'Nápoles', '#6ec6e8', '#ffffff', '#35e6ff', 'Diego Arena', 87),
        T('Roma Loba', 'ROM', 'Roma', '#8a1c2b', '#f5b324', '#ffffff', 'Olímpico Arena', 84),
        T('Lazio Águia', 'LAZ', 'Roma', '#6ec6e8', '#ffffff', '#1b3fa8', 'Olímpico Arena', 82),
        T('Atalanta Orobica', 'ATA', 'Bérgamo', '#1b3fa8', '#111111', '#35e6ff', 'Gewiss Arena', 83),
        T('Fiorentina Viola', 'FIO', 'Florença', '#6b2d8b', '#ffffff', '#c9ff3d', 'Franchi Arena', 82),
        T('Bologna Rossoblu', 'BOL', 'Bolonha', '#8a1c2b', '#1b3fa8', '#ffffff', 'Dall Ara Arena', 81),
        T('Torino Granata', 'TGR', 'Turim', '#7a1e3c', '#ffffff', '#c9ff3d', 'Filadelfia Arena', 78),
        T('Udinese Bianconero', 'UDI', 'Udine', '#111111', '#ffffff', '#c9ff3d', 'Friuli Arena', 77),
        T('Genoa Grifone', 'GEN', 'Gênova', '#8a1c2b', '#1b3fa8', '#ffffff', 'Marassi Arena', 77),
        T('Monza Brianza', 'MON', 'Monza', '#c8102e', '#ffffff', '#111111', 'Brianteo Arena', 76),
        T('Lecce Giallorosso', 'LEC', 'Lecce', '#f5b324', '#c8102e', '#ffffff', 'Via del Mare', 75),
        T('Cagliari Isolani', 'CAG', 'Cagliari', '#8a1c2b', '#1b3fa8', '#ffffff', 'Unipol Arena', 75),
        T('Verona Scaligera', 'VER', 'Verona', '#f5b324', '#1b3fa8', '#ffffff', 'Bentegodi Arena', 75),
        T('Empoli Azzurro', 'EMP', 'Empoli', '#1b5fae', '#ffffff', '#35e6ff', 'Castellani Arena', 74),
        T('Parma Crociato', 'PAR', 'Parma', '#f5b324', '#1b3fa8', '#ffffff', 'Tardini Arena', 74),
        T('Como Lago', 'COM', 'Como', '#1b5fae', '#ffffff', '#c9ff3d', 'Sinigaglia Arena', 75),
        T('Venezia Arancioneroverde', 'VEN', 'Veneza', '#f57c1f', '#0a7a3d', '#111111', 'Penzo Arena', 74)
      ]
    },
    {
      id: 'bundesliga', name: 'Bundesliga', country: 'Alemanha', flag: 'GER', region: 'europe', confed: 'UEFA',
      desc: 'Gols, pressão alta e arquibancadas em ebulição.',
      teams: [
        T('München Rot', 'MUN', 'Munique', '#c8102e', '#ffffff', '#1b3fa8', 'Allianz Arena', 90),
        T('Dortmund Gelb', 'DOR', 'Dortmund', '#f5b324', '#111111', '#ffffff', 'Signal Arena', 87),
        T('Leverkusen Werks', 'LEV', 'Leverkusen', '#c8102e', '#111111', '#ffffff', 'BayArena', 86),
        T('Leipzig Toro', 'RBL', 'Leipzig', '#f4f7fa', '#c8102e', '#1b3fa8', 'Arena Leipzig', 85),
        T('Frankfurt Adler', 'FRA', 'Frankfurt', '#111111', '#c8102e', '#ffffff', 'Waldstadion Arena', 83),
        T('Stuttgart VfB', 'STU', 'Stuttgart', '#f4f7fa', '#c8102e', '#111111', 'Neckar Arena', 82),
        T('Freiburg Breisgau', 'FRE', 'Freiburg', '#c8102e', '#111111', '#ffffff', 'Europa Arena', 80),
        T('Wolfsburg Wolf', 'WOL', 'Wolfsburg', '#0a7a3d', '#ffffff', '#c9ff3d', 'Volkswagen Arena', 80),
        T('Hoffenheim Azul', 'HOF', 'Sinsheim', '#1b3fa8', '#ffffff', '#35e6ff', 'Rhein Arena', 78),
        T('Mainz Nullfünf', 'MAI', 'Mainz', '#c8102e', '#ffffff', '#111111', 'Mewa Arena', 78),
        T('Augsburg Fugger', 'AUG', 'Augsburg', '#c8102e', '#0a7a3d', '#ffffff', 'WWK Arena', 77),
        T('Werder Bremen', 'WER', 'Bremen', '#0a7a3d', '#ffffff', '#c9ff3d', 'Weser Arena', 79),
        T('Union Berlin', 'UNB', 'Berlim', '#c8102e', '#ffffff', '#111111', 'Alte Försterei', 78),
        T('Bochum Blau', 'BOC', 'Bochum', '#1b5fae', '#ffffff', '#35e6ff', 'Ruhr Arena', 74),
        T('Mönchengladbach', 'MGL', 'Mönchengladbach', '#111111', '#ffffff', '#0a7a3d', 'Borussia Arena', 79),
        T('Köln Geißbock', 'KOL', 'Colônia', '#c8102e', '#ffffff', '#111111', 'RheinEnergie Arena', 77),
        T('Heidenheim', 'HEI', 'Heidenheim', '#1b3fa8', '#c8102e', '#ffffff', 'Voith Arena', 74),
        T('St. Pauli', 'STP', 'Hamburgo', '#5b3a1e', '#ffffff', '#c8102e', 'Millerntor Arena', 74)
      ]
    },
    {
      id: 'ligue1', name: 'Ligue 1', country: 'França', flag: 'FRA', region: 'europe', confed: 'UEFA',
      desc: 'Talento jovem, velocidade e o brilho de Paris.',
      teams: [
        T('Paris Azul', 'PSG', 'Paris', '#1b2a4a', '#c8102e', '#ffffff', 'Parc Arena', 90),
        T('Marseille Olímpico', 'MAR', 'Marselha', '#6ec6e8', '#ffffff', '#35e6ff', 'Vélodrome Arena', 84),
        T('Lyon Rhône', 'LYO', 'Lyon', '#f4f7fa', '#1b3fa8', '#c8102e', 'Groupama Arena', 83),
        T('Monaco Mônaco', 'MON', 'Monaco', '#c8102e', '#ffffff', '#111111', 'Louis Arena', 83),
        T('Lille Norte', 'LIL', 'Lille', '#c8102e', '#1b3fa8', '#ffffff', 'Métropole Arena', 82),
        T('Nice Riviera', 'NIC', 'Nice', '#c8102e', '#111111', '#ffffff', 'Riviera Arena', 81),
        T('Lens Sangue', 'LEN', 'Lens', '#f5b324', '#c8102e', '#ffffff', 'Bollaert Arena', 80),
        T('Rennes Rojo', 'REN', 'Rennes', '#c8102e', '#111111', '#ffffff', 'Roazhon Arena', 80),
        T('Strasbourg Alsace', 'STR', 'Estrasburgo', '#1b5fae', '#ffffff', '#c9ff3d', 'Rhin Arena', 78),
        T('Nantes Canário', 'NAN', 'Nantes', '#f5b324', '#0a7a3d', '#ffffff', 'Beaujoire Arena', 78),
        T('Montpellier Hérault', 'MTP', 'Montpellier', '#f57c1f', '#1b3fa8', '#ffffff', 'Mosson Arena', 77),
        T('Toulouse Violet', 'TOU', 'Toulouse', '#6b2d8b', '#ffffff', '#c9ff3d', 'Stadium Arena', 77),
        T('Brest Bretanha', 'BRT', 'Brest', '#c8102e', '#ffffff', '#111111', 'Francis Arena', 76),
        T('Reims Champagne', 'REI', 'Reims', '#c8102e', '#ffffff', '#1b3fa8', 'Auguste Arena', 76),
        T('Auxerre Azul', 'AUX', 'Auxerre', '#1b5fae', '#ffffff', '#35e6ff', 'Abbé Arena', 74),
        T('Angers Noir', 'ANG', 'Angers', '#111111', '#ffffff', '#c9ff3d', 'Raymond Arena', 74),
        T('Le Havre Céu', 'LEH', 'Le Havre', '#6ec6e8', '#1b2a4a', '#ffffff', 'Océane Arena', 73),
        T('Saint-Étienne Verde', 'STE', 'Saint-Étienne', '#0a7a3d', '#ffffff', '#c9ff3d', 'Chaudron Arena', 76)
      ]
    },
    {
      id: 'portugal', name: 'Liga Portugal', country: 'Portugal', flag: 'POR', region: 'europe', confed: 'UEFA',
      desc: 'Tradição, formação de craques e clássicos eletrizantes.',
      teams: [
        T('Lisboa Águia', 'LIS', 'Lisboa', '#c8102e', '#ffffff', '#f5b324', 'Luz Arena', 86),
        T('Porto Dragão', 'POR', 'Porto', '#1b3fa8', '#ffffff', '#c9ff3d', 'Dragão Arena', 85),
        T('Sporting Leão', 'SPO', 'Lisboa', '#0a7a3d', '#ffffff', '#c9ff3d', 'Alvalade Arena', 84),
        T('Braga Arsenalista', 'BRA', 'Braga', '#c8102e', '#ffffff', '#111111', 'Pedreira Arena', 82),
        T('Vitória Guimarães', 'VGU', 'Guimarães', '#f4f7fa', '#111111', '#c9ff3d', 'Afonso Arena', 78),
        T('Boavista Xadrez', 'BOA', 'Porto', '#111111', '#ffffff', '#c9ff3d', 'Bessa Arena', 77),
        T('Famalicão', 'FAM', 'Famalicão', '#1b5fae', '#ffffff', '#35e6ff', 'Municipal Arena', 75),
        T('Moreirense', 'MOR', 'Moreira', '#0a7a3d', '#ffffff', '#c9ff3d', 'Comendador Arena', 74),
        T('Arouca', 'ARO', 'Arouca', '#f5b324', '#111111', '#ffffff', 'Arouca Arena', 74),
        T('Gil Vicente', 'GIL', 'Barcelos', '#c8102e', '#ffffff', '#111111', 'Barcelos Arena', 74),
        T('Estoril', 'EST', 'Estoril', '#f5b324', '#1b3fa8', '#ffffff', 'Estoril Arena', 73),
        T('Rio Ave', 'RAV', 'Vila do Conde', '#0a7a3d', '#ffffff', '#c9ff3d', 'Arcos Arena', 73),
        T('Casa Pia', 'CAS', 'Lisboa', '#111111', '#ffffff', '#c9ff3d', 'Pina Arena', 72),
        T('Santa Clara', 'SCL', 'Açores', '#c8102e', '#ffffff', '#111111', 'Açores Arena', 72),
        T('Nacional Madeira', 'NAC', 'Madeira', '#111111', '#ffffff', '#c9ff3d', 'Choupana Arena', 72),
        T('Farense', 'FAR', 'Faro', '#111111', '#ffffff', '#c9ff3d', 'Algarve Arena', 71),
        T('Estrela Amadora', 'EAM', 'Amadora', '#c8102e', '#ffffff', '#111111', 'Reboleira Arena', 71),
        T('AVS', 'AVS', 'Vila das Aves', '#c8102e', '#ffffff', '#111111', 'Aves Arena', 70)
      ]
    },
    {
      id: 'eredivisie', name: 'Eredivisie', country: 'Holanda', flag: 'NED', region: 'europe', confed: 'UEFA',
      desc: 'Futebol total, jovens promessas e gols sem parar.',
      teams: [
        T('Amsterdam Clássico', 'AMS', 'Amsterdã', '#c8102e', '#ffffff', '#111111', 'Johan Arena', 85),
        T('Rotterdam Fey', 'ROT', 'Roterdã', '#c8102e', '#ffffff', '#111111', 'Kuip Arena', 83),
        T('Eindhoven PSV', 'EIN', 'Eindhoven', '#c8102e', '#ffffff', '#1b3fa8', 'Philips Arena', 84),
        T('Alkmaar AZ', 'ALK', 'Alkmaar', '#c8102e', '#ffffff', '#f5b324', 'AZ Arena', 81),
        T('Utrecht', 'UTR', 'Utrecht', '#c8102e', '#ffffff', '#111111', 'GelreDome Arena', 79),
        T('Twente', 'TWE', 'Enschede', '#c8102e', '#ffffff', '#111111', 'De Grolsch Arena', 79),
        T('Sparta Rotterdam', 'SPA', 'Roterdã', '#c8102e', '#ffffff', '#111111', 'Het Kasteel', 74),
        T('Heerenveen', 'HEE', 'Heerenveen', '#1b5fae', '#ffffff', '#35e6ff', 'Abe Lenstra Arena', 75),
        T('Groningen', 'GRO', 'Groningen', '#0a7a3d', '#ffffff', '#c9ff3d', 'Euroborg Arena', 75),
        T('NEC Nijmegen', 'NEC', 'Nijmegen', '#c8102e', '#0a7a3d', '#111111', 'Goffert Arena', 75),
        T('Go Ahead Eagles', 'GAE', 'Deventer', '#c8102e', '#f5b324', '#ffffff', 'Adelaarshorst Arena', 72),
        T('Fortuna Sittard', 'FOR', 'Sittard', '#f5b324', '#0a7a3d', '#ffffff', 'Sittard Arena', 72),
        T('Heracles', 'HER', 'Almelo', '#111111', '#ffffff', '#c9ff3d', 'Erve Asito Arena', 71),
        T('PEC Zwolle', 'ZWO', 'Zwolle', '#1b5fae', '#ffffff', '#35e6ff', 'MAC³PARK Arena', 71),
        T('RKC Waalwijk', 'RKC', 'Waalwijk', '#f5b324', '#1b3fa8', '#ffffff', 'Mandemakers Arena', 70),
        T('Willem II', 'WIL', 'Tilburg', '#c8102e', '#ffffff', '#111111', 'Koning Arena', 71),
        T('Almere City', 'ALM', 'Almere', '#c8102e', '#111111', '#ffffff', 'Yanmar Arena', 70),
        T('NAC Breda', 'NBR', 'Breda', '#f5b324', '#111111', '#ffffff', 'Rat Verlegh Arena', 71)
      ]
    },
    {
      id: 'ligamx', name: 'Liga MX', country: 'México', flag: 'MEX', region: 'northamerica', confed: 'CONCACAF',
      desc: 'Festa nas arquibancadas e futebol rápido do início ao fim.',
      teams: [
        T('América Águia', 'AME', 'Cidade do México', '#f5b324', '#1b3fa8', '#ffffff', 'Azteca Arena', 83),
        T('Monterrey Rayado', 'MTY', 'Monterrey', '#1b3fa8', '#ffffff', '#35e6ff', 'BBVA Arena', 82),
        T('Tigres UANL', 'TIG', 'Monterrey', '#f5b324', '#1b3fa8', '#ffffff', 'Universitario Arena', 83),
        T('Guadalajara Chivas', 'GUA', 'Guadalajara', '#c8102e', '#ffffff', '#111111', 'Akron Arena', 81),
        T('Cruz Azul', 'CAZ', 'Cidade do México', '#1b3fa8', '#ffffff', '#35e6ff', 'Azul Arena', 80),
        T('Pumas UNAM', 'PUM', 'Cidade do México', '#f5b324', '#1b2a4a', '#ffffff', 'Olímpico Universitario', 79),
        T('León Esmeralda', 'LEO', 'León', '#0a7a3d', '#ffffff', '#c9ff3d', 'Nou Camp Arena', 78),
        T('Toluca Diablos', 'TOL', 'Toluca', '#c8102e', '#ffffff', '#111111', 'Nemesio Arena', 79),
        T('Santos Laguna', 'SLA', 'Torreón', '#0a7a3d', '#ffffff', '#c9ff3d', 'Corona Arena', 77),
        T('Pachuca Tuzos', 'PAC', 'Pachuca', '#1b5fae', '#ffffff', '#35e6ff', 'Hidalgo Arena', 78),
        T('Atlas Zorro', 'ATL', 'Guadalajara', '#c8102e', '#111111', '#ffffff', 'Jalisco Arena', 77),
        T('Necaxa Rayos', 'NEC', 'Aguascalientes', '#c8102e', '#ffffff', '#111111', 'Victoria Arena', 75),
        T('Puebla Franja', 'PUE', 'Puebla', '#1b5fae', '#ffffff', '#35e6ff', 'Cuauhtémoc Arena', 74),
        T('Querétaro Gallo', 'QUE', 'Querétaro', '#111111', '#1b3fa8', '#ffffff', 'Corregidora Arena', 74),
        T('Mazatlán Cañón', 'MAZ', 'Mazatlán', '#6b2d8b', '#111111', '#ffffff', 'Kraken Arena', 73),
        T('Juárez Bravos', 'JUA', 'Juárez', '#0a7a3d', '#111111', '#ffffff', 'Benito Arena', 73),
        T('Tijuana Xolos', 'TIJ', 'Tijuana', '#c8102e', '#111111', '#ffffff', 'Caliente Arena', 75),
        T('San Luis', 'SLU', 'San Luis', '#c8102e', '#ffffff', '#111111', 'Alfonso Arena', 73)
      ]
    },
    {
      id: 'mls', name: 'Major League Soccer', country: 'EUA', flag: 'USA', region: 'northamerica', confed: 'CONCACAF',
      desc: 'Show, paridade e um campeonato que cresce a cada temporada.',
      teams: [
        T('Miami Flamingo', 'MIA', 'Miami', '#f7a8c4', '#111111', '#ffffff', 'Miami Arena', 81),
        T('Los Angeles Galaxy', 'LAG', 'Los Angeles', '#f4f7fa', '#1b3fa8', '#f5b324', 'Galaxy Arena', 80),
        T('LAFC Black', 'LAF', 'Los Angeles', '#111111', '#f5b324', '#ffffff', 'Banc Arena', 81),
        T('Seattle Sounder', 'SEA', 'Seattle', '#0a7a3d', '#1b3fa8', '#c9ff3d', 'Lumen Arena', 79),
        T('Atlanta United', 'ATU', 'Atlanta', '#c8102e', '#111111', '#f5b324', 'Mercedes Arena', 79),
        T('New York Red', 'NYR', 'Nova York', '#c8102e', '#ffffff', '#1b3fa8', 'Red Bull Arena', 78),
        T('New York City', 'NYC', 'Nova York', '#6ec6e8', '#1b3fa8', '#ffffff', 'Yankee Arena', 78),
        T('Portland Timbers', 'POR', 'Portland', '#0a7a3d', '#f5b324', '#ffffff', 'Providence Arena', 78),
        T('Toronto Reds', 'TOR', 'Toronto', '#c8102e', '#ffffff', '#111111', 'BMO Arena', 77),
        T('Vancouver Whitecaps', 'VAN', 'Vancouver', '#f4f7fa', '#1b3fa8', '#35e6ff', 'BC Place Arena', 77),
        T('Austin FC', 'AUS', 'Austin', '#0a7a3d', '#111111', '#c9ff3d', 'Q2 Arena', 77),
        T('Nashville SC', 'NAS', 'Nashville', '#f5b324', '#1b3fa8', '#ffffff', 'Geodis Arena', 77),
        T('Philadelphia Union', 'PHI', 'Filadélfia', '#1b2a4a', '#f5b324', '#ffffff', 'Subaru Arena', 78),
        T('Orlando City', 'ORL', 'Orlando', '#6b2d8b', '#f5b324', '#ffffff', 'Exploria Arena', 77),
        T('Columbus Crew', 'COL', 'Columbus', '#f5b324', '#111111', '#ffffff', 'Crew Arena', 79),
        T('FC Cincinnati', 'CIN', 'Cincinnati', '#f57c1f', '#1b3fa8', '#ffffff', 'TQL Arena', 78),
        T('Chicago Fire', 'CHI', 'Chicago', '#c8102e', '#1b3fa8', '#ffffff', 'Soldier Arena', 76),
        T('Minnesota United', 'MIN', 'Minneapolis', '#1b5fae', '#111111', '#35e6ff', 'Allianz Field', 76),
        T('Dallas FC', 'DAL', 'Dallas', '#c8102e', '#1b3fa8', '#ffffff', 'Toyota Arena', 77),
        T('San Jose Earthquakes', 'SJ', 'San Jose', '#1b5fae', '#111111', '#ffffff', 'PayPal Arena', 75)
      ]
    },
    {
      id: 'argentina', name: 'Liga Profesional', country: 'Argentina', flag: 'ARG', region: 'southamerica', confed: 'CONMEBOL',
      desc: 'Paixão, mística e futebol de rua em cada jogada.',
      teams: [
        T('Buenos Aires Azul', 'BAA', 'Buenos Aires', '#1b3fa8', '#f5b324', '#ffffff', 'La Bombonera Arena', 84),
        T('Buenos Aires Rojo', 'BAR', 'Buenos Aires', '#c8102e', '#ffffff', '#111111', 'Monumental Arena', 84),
        T('Racing Avellaneda', 'RAC', 'Avellaneda', '#6ec6e8', '#ffffff', '#1b3fa8', 'Cilindro Arena', 82),
        T('Independiente Rojo', 'IND', 'Avellaneda', '#c8102e', '#ffffff', '#111111', 'Libertadores Arena', 82),
        T('San Lorenzo Ciclón', 'SLO', 'Buenos Aires', '#1b3fa8', '#c8102e', '#ffffff', 'Nuevo Gasómetro', 80),
        T('Vélez Fortín', 'VEL', 'Buenos Aires', '#f4f7fa', '#1b3fa8', '#ffffff', 'Amalfitani Arena', 80),
        T('Estudiantes Pincha', 'EST', 'La Plata', '#c8102e', '#ffffff', '#111111', 'Jorge Arena', 79),
        T('Gimnasia Lobo', 'GIM', 'La Plata', '#f4f7fa', '#1b2a4a', '#ffffff', 'Bosque Arena', 77),
        T('Lanús Granate', 'LAN', 'Lanús', '#7a1e3c', '#ffffff', '#111111', 'Granate Arena', 78),
        T('Talleres Matador', 'TAL', 'Córdoba', '#f4f7fa', '#1b3fa8', '#c9ff3d', 'Boutique Arena', 79),
        T('Belgrano Pirata', 'BEL', 'Córdoba', '#6ec6e8', '#ffffff', '#1b3fa8', 'Gigante Arena', 77),
        T('Newells Lepra', 'NEW', 'Rosário', '#c8102e', '#111111', '#ffffff', 'Coloso Arena', 77),
        T('Rosario Central', 'ROS', 'Rosário', '#1b3fa8', '#f5b324', '#ffffff', 'Arroyito Arena', 78),
        T('Huracán Globo', 'HUR', 'Buenos Aires', '#f4f7fa', '#c8102e', '#111111', 'Ducó Arena', 76),
        T('Argentinos Bicho', 'ARG', 'Buenos Aires', '#c8102e', '#ffffff', '#111111', 'Diego Arena', 76),
        T('Defensa Halcón', 'DEF', 'Florencio Varela', '#0a7a3d', '#f5b324', '#ffffff', 'Norberto Arena', 76),
        T('Banfield Taladro', 'BAN', 'Banfield', '#0a7a3d', '#ffffff', '#c9ff3d', 'Florencio Sola', 75),
        T('Tigre Matador', 'TIG', 'Victoria', '#c8102e', '#1b3fa8', '#ffffff', 'Coliseo Arena', 74)
      ]
    },
    {
      id: 'saudi', name: 'Saudi Pro League', country: 'Arábia Saudita', flag: 'KSA', region: 'asia', confed: 'AFC',
      desc: 'Estrelas mundiais, estádios modernos e investimento bilionário.',
      teams: [
        T('Al-Hilal Azul', 'HIL', 'Riade', '#1b3fa8', '#ffffff', '#35e6ff', 'Kingdom Arena', 84),
        T('Al-Nassr Amarelo', 'NAS', 'Riade', '#f5b324', '#1b3fa8', '#ffffff', 'Victory Arena', 83),
        T('Al-Ittihad Preto', 'ITT', 'Jeddah', '#111111', '#f5b324', '#ffffff', 'Union Arena', 82),
        T('Al-Ahli Verde', 'AHL', 'Jeddah', '#0a7a3d', '#ffffff', '#c9ff3d', 'Ahli Arena', 81),
        T('Al-Shabab Branco', 'SHA', 'Riade', '#f4f7fa', '#111111', '#c9ff3d', 'Shabab Arena', 78),
        T('Al-Ettifaq Verde', 'ETT', 'Dammam', '#0a7a3d', '#ffffff', '#c9ff3d', 'Ettifaq Arena', 77),
        T('Al-Taawoun', 'TAA', 'Buraidah', '#f5b324', '#1b3fa8', '#ffffff', 'Taawoun Arena', 76),
        T('Al-Fateh', 'FAT', 'Al-Hasa', '#c8102e', '#ffffff', '#111111', 'Fateh Arena', 75),
        T('Al-Fayha', 'FAY', 'Al-Majmaah', '#f57c1f', '#1b3fa8', '#ffffff', 'Fayha Arena', 74),
        T('Al-Riyadh', 'RIY', 'Riade', '#f4f7fa', '#1b3fa8', '#ffffff', 'Riyadh Arena', 73),
        T('Damac', 'DAM', 'Khamis Mushait', '#1b3fa8', '#ffffff', '#35e6ff', 'Damac Arena', 73),
        T('Al-Khaleej', 'KHA', 'Saihat', '#f5b324', '#111111', '#ffffff', 'Khaleej Arena', 72),
        T('Al-Wehda', 'WEH', 'Meca', '#c8102e', '#ffffff', '#111111', 'Wehda Arena', 73),
        T('Al-Orobah', 'ORO', 'Sakaka', '#f57c1f', '#111111', '#ffffff', 'Orobah Arena', 71),
        T('Al-Qadsiah', 'QAD', 'Khobar', '#f5b324', '#1b3fa8', '#ffffff', 'Qadsiah Arena', 75),
        T('Al-Okhdood', 'OKH', 'Najran', '#c8102e', '#111111', '#ffffff', 'Okhdood Arena', 71),
        T('Al-Raed', 'RAE', 'Buraidah', '#c8102e', '#111111', '#ffffff', 'Raed Arena', 72),
        T('Al-Kholood', 'KHO', 'Ar Rass', '#0a7a3d', '#ffffff', '#c9ff3d', 'Kholood Arena', 71)
      ]
    }
  ];

  const NATIONAL_TEAMS = [
    ['Brasil', 'BRA', 'Brasil', '#f5d000', '#0a7a3d', '#1b3fa8', 'Maracanã Nacional', 89, 'southamerica'],
    ['Argentina', 'ARG', 'Argentina', '#6ec6e8', '#ffffff', '#f5b324', 'Monumental Nacional', 89, 'southamerica'],
    ['França', 'FRA', 'França', '#1b3fa8', '#ffffff', '#c8102e', 'Stade de France', 88, 'europe'],
    ['Espanha', 'ESP', 'Espanha', '#c8102e', '#f5b324', '#ffffff', 'La Cartuja Nacional', 88, 'europe'],
    ['Alemanha', 'GER', 'Alemanha', '#f4f7fa', '#111111', '#c8102e', 'Olympiastadion', 87, 'europe'],
    ['Inglaterra', 'ENG', 'Inglaterra', '#f4f7fa', '#1b2a4a', '#c8102e', 'Wembley Nacional', 87, 'europe'],
    ['Portugal', 'POR', 'Portugal', '#c8102e', '#0a7a3d', '#f5b324', 'Luz Nacional', 86, 'europe'],
    ['Itália', 'ITA', 'Itália', '#1b3fa8', '#ffffff', '#c9ff3d', 'Olímpico Nacional', 85, 'europe'],
    ['Holanda', 'NED', 'Holanda', '#f57c1f', '#ffffff', '#1b3fa8', 'Johan Nacional', 85, 'europe'],
    ['Bélgica', 'BEL', 'Bélgica', '#c8102e', '#111111', '#f5b324', 'Baudouin Nacional', 84, 'europe'],
    ['Croácia', 'CRO', 'Croácia', '#c8102e', '#ffffff', '#1b3fa8', 'Maksimir Nacional', 84, 'europe'],
    ['Uruguai', 'URU', 'Uruguai', '#6ec6e8', '#ffffff', '#111111', 'Centenário Nacional', 82, 'southamerica'],
    ['Colômbia', 'COL', 'Colômbia', '#f5d000', '#1b3fa8', '#c8102e', 'Metropolitano Nacional', 82, 'southamerica'],
    ['México', 'MEX', 'México', '#0a7a3d', '#ffffff', '#c8102e', 'Azteca Nacional', 80, 'northamerica'],
    ['EUA', 'USA', 'Estados Unidos', '#f4f7fa', '#1b3fa8', '#c8102e', 'National Arena', 80, 'northamerica'],
    ['Japão', 'JPN', 'Japão', '#1b3fa8', '#ffffff', '#c8102e', 'Saitama Nacional', 80, 'asia'],
    ['Coreia do Sul', 'KOR', 'Coreia do Sul', '#c8102e', '#ffffff', '#1b3fa8', 'Seoul Nacional', 78, 'asia'],
    ['Marrocos', 'MAR', 'Marrocos', '#c8102e', '#0a7a3d', '#ffffff', 'Rabat Nacional', 80, 'africa'],
    ['Senegal', 'SEN', 'Senegal', '#0a7a3d', '#f5d000', '#c8102e', 'Diamniadio Nacional', 79, 'africa'],
    ['Nigéria', 'NGA', 'Nigéria', '#0a7a3d', '#ffffff', '#c9ff3d', 'Abuja Nacional', 78, 'africa'],
    ['Suíça', 'SUI', 'Suíça', '#c8102e', '#ffffff', '#111111', 'Wankdorf Nacional', 78, 'europe'],
    ['Dinamarca', 'DEN', 'Dinamarca', '#c8102e', '#ffffff', '#111111', 'Parken Nacional', 79, 'europe'],
    ['Áustria', 'AUT', 'Áustria', '#c8102e', '#ffffff', '#111111', 'Ernst Nacional', 78, 'europe'],
    ['Turquia', 'TUR', 'Turquia', '#c8102e', '#ffffff', '#111111', 'Atatürk Nacional', 78, 'europe']
  ];

  const NAME_POOLS = {
    br: {
      first: ['Alisson', 'Anderson', 'Bento', 'Bruno', 'Caio', 'Carlos', 'Danilo', 'Douglas', 'Éder', 'Everton', 'Fabrício', 'Felipe', 'Gabriel', 'Gustavo', 'Heitor', 'Hugo', 'Igor', 'Ítalo', 'Jair', 'João', 'Kaio', 'Léo', 'Lucas', 'Marcelo', 'Matheus', 'Miguel', 'Murilo', 'Natan', 'Nicolas', 'Otávio', 'Paulo', 'Pedro', 'Rafael', 'Renan', 'Ricardo', 'Rodrigo', 'Samuel', 'Thiago', 'Vitor', 'Wesley', 'Yuri', 'Arthur', 'Bernardo', 'Davi', 'Enzo', 'Vinícius', 'Cauã', 'Diego', 'Eduardo', 'Fernando', 'Guilherme', 'Henrique', 'Iago', 'Jonas', 'Kauan', 'Luan', 'Márcio', 'Nathan', 'Osvaldo', 'Ruan', 'Sérgio', 'Tales', 'Uber', 'Valdir', 'Wallace', 'Zé'],
      last: ['Almeida', 'Alves', 'Andrade', 'Araújo', 'Barbosa', 'Barros', 'Batista', 'Borges', 'Braga', 'Brito', 'Cardoso', 'Carvalho', 'Castro', 'Costa', 'Dias', 'Duarte', 'Farias', 'Fernandes', 'Ferreira', 'Fonseca', 'Freitas', 'Gomes', 'Gonçalves', 'Lima', 'Lopes', 'Machado', 'Martins', 'Mendes', 'Miranda', 'Monteiro', 'Moraes', 'Moreira', 'Nascimento', 'Neves', 'Nunes', 'Oliveira', 'Pereira', 'Pinto', 'Queiroz', 'Ramos', 'Reis', 'Ribeiro', 'Rocha', 'Rodrigues', 'Sales', 'Santana', 'Santos', 'Silva', 'Soares', 'Souza', 'Teixeira', 'Vieira', 'Furtado', 'Macedo', 'Paiva', 'Pires', 'Sampaio', 'Vasconcelos']
    },
    ar: {
      first: ['Agustín', 'Alejandro', 'Ángel', 'Axel', 'Bruno', 'Cristian', 'Diego', 'Emiliano', 'Enzo', 'Facundo', 'Federico', 'Franco', 'Gonzalo', 'Ignacio', 'Javier', 'Joaquín', 'Julián', 'Lautaro', 'Leandro', 'Lucas', 'Manuel', 'Marcos', 'Matías', 'Mauro', 'Nicolás', 'Pablo', 'Ramiro', 'Rodrigo', 'Santiago', 'Sebastián', 'Thiago', 'Tomás', 'Valentín', 'Ariel', 'Brian', 'Ciro', 'Dante', 'Ezequiel', 'Gastón', 'Hernán'],
      last: ['Acosta', 'Aguirre', 'Álvarez', 'Aranda', 'Benitez', 'Bianchi', 'Cabrera', 'Cáceres', 'Cardozo', 'Carrizo', 'Castillo', 'Castro', 'Correa', 'Costa', 'Díaz', 'Domínguez', 'Escobar', 'Fernández', 'Ferreyra', 'Figueroa', 'Flores', 'Gómez', 'González', 'Gutiérrez', 'Herrera', 'Ibarra', 'Juárez', 'Ledesma', 'López', 'Luna', 'Maldonado', 'Martínez', 'Medina', 'Méndez', 'Molina', 'Morales', 'Moreno', 'Navarro', 'Núñez', 'Ojeda', 'Ortiz', 'Paz', 'Pereyra', 'Pérez', 'Quiroga', 'Ramírez', 'Ramos', 'Ríos', 'Rivero', 'Rodríguez', 'Romero', 'Ruiz', 'Sánchez', 'Silva', 'Sosa', 'Suárez', 'Torres', 'Vega', 'Velázquez', 'Zárate']
    },
    en: {
      first: ['Alex', 'Andrew', 'Ben', 'Callum', 'Charlie', 'Chris', 'Daniel', 'David', 'Declan', 'Elliot', 'Ethan', 'George', 'Harry', 'Jack', 'Jacob', 'James', 'Jamie', 'Joe', 'John', 'Jordan', 'Josh', 'Kieran', 'Liam', 'Luke', 'Mason', 'Matthew', 'Michael', 'Nathan', 'Oliver', 'Owen', 'Paul', 'Reece', 'Ryan', 'Sam', 'Scott', 'Sean', 'Thomas', 'Tom', 'Tyler', 'William', 'Aaron', 'Adam', 'Aiden', 'Alfie', 'Archie', 'Cole', 'Connor', 'Dylan', 'Edward', 'Finn'],
      last: ['Adams', 'Allen', 'Anderson', 'Baker', 'Banks', 'Barnes', 'Bell', 'Bennett', 'Brooks', 'Brown', 'Butler', 'Campbell', 'Carter', 'Clark', 'Cole', 'Collins', 'Cook', 'Cooper', 'Cox', 'Davies', 'Davis', 'Edwards', 'Evans', 'Foster', 'Garcia', 'Gray', 'Green', 'Hall', 'Harris', 'Harrison', 'Hill', 'Hughes', 'Jackson', 'James', 'Johnson', 'Jones', 'Kelly', 'King', 'Lee', 'Lewis', 'Martin', 'Miller', 'Mitchell', 'Moore', 'Morgan', 'Morris', 'Murphy', 'Nelson', 'Parker', 'Phillips', 'Price', 'Reed', 'Roberts', 'Robinson', 'Ross', 'Russell', 'Scott', 'Smith', 'Taylor', 'Thomas', 'Thompson', 'Turner', 'Walker', 'Ward', 'Watson', 'White', 'Williams', 'Wilson', 'Wood', 'Wright', 'Young']
    },
    es: {
      first: ['Adrián', 'Álvaro', 'Andrés', 'Ángel', 'Antonio', 'Carlos', 'César', 'Daniel', 'David', 'Diego', 'Eduardo', 'Emilio', 'Enrique', 'Fernando', 'Francisco', 'Gabriel', 'Gonzalo', 'Héctor', 'Hugo', 'Ignacio', 'Iván', 'Javier', 'Jesús', 'Jorge', 'José', 'Juan', 'Luis', 'Manuel', 'Marcos', 'Mario', 'Martín', 'Miguel', 'Nicolás', 'Óscar', 'Pablo', 'Pedro', 'Rafael', 'Raúl', 'Rubén', 'Sergio', 'Tomás', 'Víctor', 'Aitor', 'Alejandro', 'Bryan', 'Dani', 'Iker', 'Isco', 'Joaquín', 'Marco'],
      last: ['Alonso', 'Álvarez', 'Aparicio', 'Arias', 'Bermúdez', 'Blanco', 'Cabrera', 'Calvo', 'Campos', 'Cano', 'Carmona', 'Carrasco', 'Castillo', 'Castro', 'Cortés', 'Cruz', 'Delgado', 'Díaz', 'Domínguez', 'Duarte', 'Esteban', 'Fernández', 'Ferrer', 'Flores', 'Fuentes', 'Gallego', 'García', 'Garrido', 'Gil', 'Gómez', 'González', 'Gutiérrez', 'Hernández', 'Herrera', 'Iglesias', 'Jiménez', 'Lara', 'López', 'Lozano', 'Marín', 'Márquez', 'Martín', 'Martínez', 'Medina', 'Méndez', 'Molina', 'Montero', 'Morales', 'Moreno', 'Navarro', 'Núñez', 'Ortega', 'Ortiz', 'Pascual', 'Pérez', 'Prieto', 'Ramos', 'Rey', 'Rivas', 'Rivera', 'Rodríguez', 'Romero', 'Rubio', 'Ruiz', 'Sáez', 'Sánchez', 'Santos', 'Serrano', 'Suárez', 'Torres', 'Vargas', 'Vega', 'Vidal']
    },
    it: {
      first: ['Alessandro', 'Alessio', 'Andrea', 'Antonio', 'Carlo', 'Davide', 'Domenico', 'Edoardo', 'Emanuele', 'Fabio', 'Federico', 'Filippo', 'Francesco', 'Gabriele', 'Giacomo', 'Gianluca', 'Giovanni', 'Giuseppe', 'Jacopo', 'Leonardo', 'Lorenzo', 'Luca', 'Luciano', 'Marco', 'Mario', 'Massimo', 'Matteo', 'Michele', 'Nicolò', 'Paolo', 'Pietro', 'Riccardo', 'Roberto', 'Salvatore', 'Simone', 'Stefano', 'Tommaso', 'Valerio', 'Vincenzo', 'Vittorio', 'Alberto', 'Angelo', 'Claudio', 'Daniele', 'Enrico', 'Ettore', 'Franco', 'Gabriel', 'Luigi', 'Raffaele'],
      last: ['Amato', 'Barbieri', 'Basile', 'Benedetti', 'Bernardi', 'Bianchi', 'Bianco', 'Bruno', 'Caputo', 'Caruso', 'Cattaneo', 'Colombo', 'Conti', 'Costa', 'D Amico', 'De Luca', 'Donati', 'Esposito', 'Fabbri', 'Ferrari', 'Ferri', 'Fiore', 'Fontana', 'Galli', 'Gallo', 'Gatti', 'Gentile', 'Giordano', 'Giuliani', 'Grasso', 'Greco', 'Guerra', 'Leone', 'Lombardi', 'Longo', 'Mancini', 'Marchetti', 'Marini', 'Martinelli', 'Martini', 'Mazza', 'Messina', 'Molina', 'Monti', 'Moretti', 'Neri', 'Orlando', 'Palmieri', 'Palumbo', 'Parisi', 'Pellegrini', 'Rinaldi', 'Riva', 'Rizzo', 'Romano', 'Rossi', 'Russo', 'Sala', 'Sanna', 'Santoro', 'Sartori', 'Serra', 'Silvestri', 'Testa', 'Valentini', 'Villa', 'Vitale']
    },
    de: {
      first: ['Alexander', 'Andreas', 'Benjamin', 'Christian', 'Daniel', 'David', 'Dominik', 'Elias', 'Emil', 'Fabian', 'Felix', 'Finn', 'Florian', 'Frank', 'Jan', 'Jonas', 'Julian', 'Kai', 'Kevin', 'Lars', 'Leon', 'Lukas', 'Marco', 'Mario', 'Martin', 'Matthias', 'Max', 'Michael', 'Moritz', 'Niklas', 'Nico', 'Oliver', 'Pascal', 'Patrick', 'Paul', 'Philipp', 'Ralf', 'Robert', 'Robin', 'Sebastian', 'Simon', 'Stefan', 'Sven', 'Thomas', 'Tim', 'Tobias', 'Tom', 'Uwe', 'Valentin', 'Vincent'],
      last: ['Bauer', 'Becker', 'Berger', 'Braun', 'Dietrich', 'Fischer', 'Frank', 'Friedrich', 'Fuchs', 'Graf', 'Haas', 'Hartmann', 'Heinrich', 'Herrmann', 'Hoffmann', 'Horn', 'Jäger', 'Kaiser', 'Keller', 'Klein', 'Koch', 'König', 'Krause', 'Krüger', 'Lange', 'Lehmann', 'Lorenz', 'Ludwig', 'Maier', 'Mayer', 'Meier', 'Meyer', 'Möller', 'Müller', 'Neumann', 'Peters', 'Pfeiffer', 'Richter', 'Riedel', 'Roth', 'Sauer', 'Schäfer', 'Schmid', 'Schmidt', 'Schneider', 'Scholz', 'Schröder', 'Schulz', 'Schuster', 'Schwarz', 'Seidel', 'Simon', 'Stein', 'Thomas', 'Vogel', 'Vogt', 'Wagner', 'Walter', 'Weber', 'Weiß', 'Werner', 'Wolf', 'Wolff', 'Zimmermann']
    },
    fr: {
      first: ['Alexandre', 'Antoine', 'Arthur', 'Benjamin', 'Benoît', 'Baptiste', 'Charles', 'Clément', 'Corentin', 'Damien', 'David', 'Enzo', 'Étienne', 'Evan', 'Fabien', 'Florian', 'François', 'Gabriel', 'Gaël', 'Grégoire', 'Guillaume', 'Hugo', 'Jean', 'Jérémy', 'Jules', 'Julien', 'Kévin', 'Léo', 'Louis', 'Lucas', 'Mathieu', 'Maxime', 'Nicolas', 'Noah', 'Olivier', 'Paul', 'Pierre', 'Quentin', 'Raphaël', 'Rémi', 'Romain', 'Samuel', 'Simon', 'Stéphane', 'Théo', 'Thomas', 'Timothée', 'Valentin', 'Victor', 'Yanis'],
      last: ['André', 'Arnaud', 'Aubert', 'Barbier', 'Bertrand', 'Blanc', 'Bonnet', 'Boucher', 'Bourgeois', 'Brun', 'Caron', 'Charpentier', 'Chevalier', 'Clement', 'Colin', 'David', 'Denis', 'Dubois', 'Dufour', 'Dumas', 'Dupont', 'Durand', 'Faure', 'Fontaine', 'Fournier', 'François', 'Garnier', 'Gauthier', 'Gérard', 'Girard', 'Giraud', 'Guérin', 'Henry', 'Hubert', 'Julien', 'Laurent', 'Leblanc', 'Leclerc', 'Lefebvre', 'Legrand', 'Lemaire', 'Leroy', 'Lucas', 'Marchand', 'Martin', 'Masson', 'Menard', 'Mercier', 'Meunier', 'Meyer', 'Moreau', 'Muller', 'Nicolas', 'Perrin', 'Petit', 'Philippe', 'Picard', 'Renard', 'Renaud', 'Rivière', 'Robert', 'Robin', 'Rousseau', 'Roy', 'Simon', 'Thomas', 'Vidal', 'Vincent']
    },
    pt: {
      first: ['Afonso', 'Alexandre', 'André', 'António', 'Bernardo', 'Bruno', 'Carlos', 'Diogo', 'Duarte', 'Eduardo', 'Fábio', 'Filipe', 'Francisco', 'Gabriel', 'Gonçalo', 'Guilherme', 'Gustavo', 'Hugo', 'Ivo', 'João', 'Joaquim', 'José', 'Leonardo', 'Lourenço', 'Luís', 'Manuel', 'Marco', 'Martim', 'Mateus', 'Miguel', 'Nuno', 'Paulo', 'Pedro', 'Rafael', 'Ricardo', 'Rodrigo', 'Rúben', 'Salvador', 'Sérgio', 'Simão', 'Tiago', 'Tomás', 'Vasco', 'Vicente', 'Vítor', 'Xavier', 'Dinis', 'Edgar', 'Isaac', 'Leandro'],
      last: ['Almeida', 'Alves', 'Amorim', 'Andrade', 'Araújo', 'Barbosa', 'Barros', 'Bastos', 'Batista', 'Bento', 'Borges', 'Braga', 'Brito', 'Cardoso', 'Carvalho', 'Castro', 'Coelho', 'Correia', 'Costa', 'Cruz', 'Cunha', 'Dias', 'Duarte', 'Esteves', 'Faria', 'Fernandes', 'Ferreira', 'Figueiredo', 'Fonseca', 'Freitas', 'Gomes', 'Gonçalves', 'Lima', 'Lopes', 'Loureiro', 'Machado', 'Magalhães', 'Marques', 'Martins', 'Matos', 'Melo', 'Mendes', 'Miranda', 'Monteiro', 'Moreira', 'Mota', 'Neves', 'Nunes', 'Oliveira', 'Pereira', 'Pinheiro', 'Pinto', 'Pires', 'Ramos', 'Reis', 'Ribeiro', 'Rocha', 'Rodrigues', 'Rosa', 'Santos', 'Silva', 'Simões', 'Soares', 'Sousa', 'Teixeira', 'Torres', 'Valente', 'Vieira']
    },
    nl: {
      first: ['Aiden', 'Bram', 'Cas', 'Daan', 'Daniël', 'Dylan', 'Emiel', 'Fabian', 'Finn', 'Floris', 'Gijs', 'Hugo', 'Ivan', 'Jasper', 'Jesse', 'Jordy', 'Julian', 'Kees', 'Lars', 'Levi', 'Lucas', 'Mats', 'Max', 'Mees', 'Milan', 'Niek', 'Noah', 'Olivier', 'Pepijn', 'Pieter', 'Rens', 'Ruben', 'Sam', 'Sem', 'Stijn', 'Teun', 'Thijs', 'Thomas', 'Tijn', 'Tim', 'Tobias', 'Tom', 'Wout', 'Yannick', 'Zakaria', 'Bo', 'Dennis', 'Erik', 'Mark', 'Rick'],
      last: ['Bakker', 'Brouwer', 'Dekker', 'De Boer', 'De Bruin', 'De Graaf', 'De Groot', 'De Jong', 'De Lange', 'De Vries', 'Dijkstra', 'Driessen', 'Evers', 'Gerritsen', 'Hendriks', 'Hoekstra', 'Jacobs', 'Jansen', 'Janssen', 'Koster', 'Kuipers', 'Lamers', 'Maas', 'Meijer', 'Mulder', 'Peters', 'Post', 'Prins', 'Sanders', 'Smit', 'Smits', 'Timmermans', 'Van Beek', 'Van Dam', 'Van Den Berg', 'Van Dijk', 'Van Leeuwen', 'Van Loon', 'Van Vliet', 'Veenstra', 'Vermeulen', 'Visser', 'Vos', 'Willems', 'Wolters', 'Zijlstra', 'Bos', 'Bosch', 'Groen', 'Kok']
    },
    mx: {
      first: ['Adolfo', 'Alejandro', 'Ángel', 'Arturo', 'Carlos', 'César', 'Christian', 'Daniel', 'David', 'Diego', 'Eduardo', 'Emilio', 'Enrique', 'Ernesto', 'Esteban', 'Fernando', 'Francisco', 'Gerardo', 'Hugo', 'Ignacio', 'Iván', 'Javier', 'Jesús', 'Jorge', 'José', 'Juan', 'Luis', 'Manuel', 'Marco', 'Mauricio', 'Miguel', 'Néstor', 'Omar', 'Óscar', 'Pablo', 'Pedro', 'Rafael', 'Ramón', 'Raúl', 'Ricardo', 'Roberto', 'Rodrigo', 'Santiago', 'Sergio', 'Ulises', 'Víctor', 'Alonso', 'Axel', 'Emiliano', 'Leonardo'],
      last: ['Aguilar', 'Alvarado', 'Álvarez', 'Ambriz', 'Bautista', 'Becerra', 'Beltrán', 'Bermúdez', 'Caballero', 'Camacho', 'Campos', 'Cárdenas', 'Carrillo', 'Castañeda', 'Castillo', 'Castro', 'Cervantes', 'Contreras', 'Cordero', 'Cruz', 'Delgado', 'Díaz', 'Domínguez', 'Duarte', 'Escobar', 'Espinoza', 'Estrada', 'Figueroa', 'Flores', 'Fuentes', 'García', 'Gómez', 'González', 'Gutiérrez', 'Guzmán', 'Hernández', 'Herrera', 'Jiménez', 'Juárez', 'Lara', 'León', 'López', 'Luna', 'Márquez', 'Martínez', 'Medina', 'Mendoza', 'Meza', 'Molina', 'Morales', 'Moreno', 'Muñoz', 'Navarro', 'Núñez', 'Ortiz', 'Pacheco', 'Padilla', 'Palacios', 'Peña', 'Pérez', 'Ramírez', 'Ramos', 'Reyes', 'Ríos', 'Rivera', 'Rodríguez', 'Romero', 'Rosales', 'Ruiz', 'Salazar', 'Sánchez', 'Sandoval', 'Santos', 'Soto', 'Suárez', 'Torres', 'Trejo', 'Valdez', 'Vargas', 'Vásquez', 'Vega', 'Velázquez', 'Vera', 'Zamora']
    },
    us: {
      first: ['Aaron', 'Adam', 'Alex', 'Andrew', 'Anthony', 'Austin', 'Ben', 'Brandon', 'Brian', 'Cameron', 'Carlos', 'Chris', 'Cody', 'Cole', 'Colin', 'Connor', 'Daniel', 'David', 'Derek', 'Dylan', 'Ethan', 'Evan', 'Gabriel', 'Grant', 'Ian', 'Jack', 'Jacob', 'Jake', 'James', 'Jason', 'Jeremy', 'John', 'Jonathan', 'Jordan', 'Jose', 'Josh', 'Justin', 'Kevin', 'Kyle', 'Logan', 'Lucas', 'Luke', 'Marcus', 'Mark', 'Matt', 'Michael', 'Nathan', 'Nick', 'Noah', 'Patrick', 'Paul', 'Peter', 'Ryan', 'Sam', 'Scott', 'Sean', 'Seth', 'Stephen', 'Tyler', 'William', 'Zach'],
      last: ['Adams', 'Allen', 'Anderson', 'Baker', 'Barnes', 'Bell', 'Bennett', 'Brooks', 'Brown', 'Bryant', 'Butler', 'Campbell', 'Carter', 'Clark', 'Coleman', 'Collins', 'Cook', 'Cooper', 'Cox', 'Davis', 'Diaz', 'Edwards', 'Evans', 'Fisher', 'Foster', 'Garcia', 'Gonzalez', 'Gray', 'Green', 'Hall', 'Harris', 'Harrison', 'Hayes', 'Henderson', 'Hernandez', 'Hill', 'Howard', 'Hughes', 'Jackson', 'James', 'Jenkins', 'Johnson', 'Jones', 'Kelly', 'Kennedy', 'King', 'Lee', 'Lewis', 'Long', 'Lopez', 'Martin', 'Martinez', 'Miller', 'Mitchell', 'Moore', 'Morgan', 'Morris', 'Murphy', 'Nelson', 'Parker', 'Perez', 'Perry', 'Peterson', 'Phillips', 'Powell', 'Price', 'Ramirez', 'Reed', 'Reyes', 'Richards', 'Richardson', 'Rivera', 'Roberts', 'Robinson', 'Rodriguez', 'Rogers', 'Ross', 'Russell', 'Sanchez', 'Sanders', 'Scott', 'Simmons', 'Smith', 'Stewart', 'Sullivan', 'Taylor', 'Thomas', 'Thompson', 'Torres', 'Turner', 'Walker', 'Ward', 'Washington', 'Watson', 'White', 'Williams', 'Wilson', 'Wood', 'Wright', 'Young']
    },
    sa: {
      first: ['Abdullah', 'Ahmed', 'Ali', 'Ammar', 'Anas', 'Bandar', 'Faisal', 'Hamza', 'Hassan', 'Ibrahim', 'Khalid', 'Majed', 'Mohammed', 'Nasser', 'Omar', 'Osama', 'Rakan', 'Salem', 'Saud', 'Sultan', 'Tariq', 'Yasser', 'Yousef', 'Ziyad', 'Abdulaziz', 'Abdulrahman', 'Adel', 'Ayman', 'Bader', 'Hatem', 'Jaber', 'Jawad', 'Khaled', 'Mansour', 'Meshari', 'Mubarak', 'Nawaf', 'Rashid', 'Saad', 'Saeed', 'Saleh', 'Sami', 'Waleed', 'Yahya', 'Zakaria', 'Ahmad', 'Hussain', 'Karim', 'Mahmoud', 'Mustafa'],
      last: ['Al-Dosari', 'Al-Faraj', 'Al-Ghamdi', 'Al-Harbi', 'Al-Hassan', 'Al-Juhani', 'Al-Malki', 'Al-Mutairi', 'Al-Nasser', 'Al-Otaibi', 'Al-Qahtani', 'Al-Rashid', 'Al-Saud', 'Al-Shahrani', 'Al-Shehri', 'Al-Sulaiman', 'Al-Zahrani', 'Al-Ahmad', 'Al-Ali', 'Al-Amri', 'Al-Anazi', 'Al-Asiri', 'Al-Balawi', 'Al-Bishi', 'Al-Dawsari', 'Al-Dossari', 'Al-Enezi', 'Al-Ghannam', 'Al-Hamdan', 'Al-Harthi', 'Al-Johani', 'Al-Khaldi', 'Al-Malki', 'Al-Mohammed', 'Al-Mousa', 'Al-Najjar', 'Al-Omari', 'Al-Rashed', 'Al-Saleh', 'Al-Shehri', 'Al-Tamimi', 'Al-Yami', 'Al-Zubair', 'Bakr', 'Hassan', 'Ibrahim', 'Khalil', 'Mahmoud', 'Saleh', 'Yusuf']
    }
  };
  NAME_POOLS.intl = NAME_POOLS.en;

  const LEAGUE_POOL = {
    brasileirao: 'br', premier: 'en', laliga: 'es', seriea: 'it', bundesliga: 'de',
    ligue1: 'fr', portugal: 'pt', eredivisie: 'nl', ligamx: 'mx', mls: 'us',
    argentina: 'ar', saudi: 'sa'
  };

  const FORMATIONS = {
    '4-3-3': [
      ['GK', .045, .50], ['LB', .20, .16], ['CB', .16, .37], ['CB', .16, .63], ['RB', .20, .84],
      ['CM', .35, .28], ['CM', .31, .50], ['CM', .35, .72],
      ['LW', .54, .17], ['ST', .57, .50], ['RW', .54, .83]
    ],
    '4-4-2': [
      ['GK', .045, .50], ['LB', .20, .16], ['CB', .16, .37], ['CB', .16, .63], ['RB', .20, .84],
      ['LM', .40, .15], ['CM', .36, .39], ['CM', .36, .61], ['RM', .40, .85],
      ['ST', .56, .40], ['ST', .56, .60]
    ],
    '4-2-3-1': [
      ['GK', .045, .50], ['LB', .20, .16], ['CB', .16, .37], ['CB', .16, .63], ['RB', .20, .84],
      ['DM', .33, .38], ['DM', .33, .62],
      ['LW', .48, .18], ['AM', .46, .50], ['RW', .48, .82], ['ST', .59, .50]
    ],
    '3-5-2': [
      ['GK', .045, .50], ['CB', .16, .30], ['CB', .14, .50], ['CB', .16, .70],
      ['LM', .34, .10], ['CM', .34, .34], ['DM', .30, .50], ['CM', .34, .66], ['RM', .34, .90],
      ['ST', .58, .40], ['ST', .58, .60]
    ],
    '5-3-2': [
      ['GK', .045, .50], ['LB', .22, .12], ['CB', .15, .31], ['CB', .13, .50], ['CB', .15, .69], ['RB', .22, .88],
      ['CM', .35, .33], ['CM', .32, .50], ['CM', .35, .67],
      ['ST', .57, .41], ['ST', .57, .59]
    ],
    '4-1-4-1': [
      ['GK', .045, .50], ['LB', .20, .16], ['CB', .16, .37], ['CB', .16, .63], ['RB', .20, .84],
      ['DM', .31, .50], ['LM', .44, .14], ['CM', .40, .38], ['CM', .40, .62], ['RM', .44, .86],
      ['ST', .58, .50]
    ]
  };

  const ROLE_GROUP = {
    GK: ['GK'], CB: ['CB', 'LB', 'RB', 'DM'], LB: ['LB', 'CB', 'LM', 'LW'], RB: ['RB', 'CB', 'RM', 'RW'],
    DM: ['DM', 'CM', 'CB'], CM: ['CM', 'DM', 'AM'], AM: ['AM', 'CM', 'LW', 'RW', 'ST'],
    LM: ['LM', 'LW', 'CM', 'LB'], RM: ['RM', 'RW', 'CM', 'RB'], LW: ['LW', 'LM', 'ST', 'AM'], RW: ['RW', 'RM', 'ST', 'AM'], ST: ['ST', 'RW', 'LW', 'AM']
  };

  const SQUAD_POSITIONS = ['GK', 'GK', 'RB', 'CB', 'CB', 'LB', 'DM', 'CM', 'CM', 'AM', 'RW', 'LW', 'ST', 'ST', 'CB', 'CM', 'W', 'ST'];

  const STADIUMS = [
    { id: 'arena-aurora', name: 'Arena Aurora', city: 'Neo Horizonte', capacity: 68000, unlock: false, sky: 'noite' },
    { id: 'estadio-palmeiras', name: 'Estádio das Palmeiras', city: 'Costa Verde', capacity: 54000, unlock: false, sky: 'dia' },
    { id: 'coliseu-sul', name: 'Coliseu do Sul', city: 'Porto Claro', capacity: 61000, unlock: false, sky: 'noite' },
    { id: 'arena-pacifico', name: 'Arena Pacífico', city: 'Baía Azul', capacity: 47000, unlock: false, sky: 'entardecer' },
    { id: 'parque-real', name: 'Parque Real', city: 'Vale Dourado', capacity: 75000, unlock: true, cost: 1200, sky: 'dia' },
    { id: 'templo-futebol', name: 'Templo do Futebol', city: 'Monte Alto', capacity: 88000, unlock: true, cost: 2200, sky: 'noite' },
    { id: 'arena-neon', name: 'Arena Neon', city: 'Cidade Digital', capacity: 52000, unlock: true, cost: 1800, sky: 'noite' },
    { id: 'estadio-chuva', name: 'Estádio da Chuva', city: 'Porto Cinza', capacity: 43000, unlock: true, cost: 900, sky: 'chuva' }
  ];

  const BALLS = [
    { id: 'classic', name: 'Clássico Branco', desc: 'A bola oficial de todas as competições.', cost: 0 },
    { id: 'neon', name: 'Neon Volt', desc: 'Detalhes fluorescentes que brilham à noite.', cost: 600 },
    { id: 'ouro', name: 'Ouro 24K', desc: 'Para quem joga como campeão.', cost: 1500 },
    { id: 'retro', name: 'Retrô 1970', desc: 'Costuras largas e couro envelhecido.', cost: 800 }
  ];

  const KITS = [
    { id: 'default', name: 'Manto Padrão', desc: 'As cores oficiais do seu clube.', cost: 0 },
    { id: 'listrado', name: 'Listrado Clássico', desc: 'Faixas verticais em alto contraste.', cost: 500 },
    { id: 'metallic', name: 'Cromado', desc: 'Acabamento metálico exclusivo.', cost: 1200 },
    { id: 'neon-kit', name: 'Neon Night', desc: 'Uniformes com brilho noturno.', cost: 1000 }
  ];

  const CELEBRATIONS = [
    { id: 'classic', name: 'Comemoração Clássica', cost: 0 },
    { id: 'slide', name: 'Carrinho no Gramado', cost: 400 },
    { id: 'dance', name: 'Dança do Craque', cost: 700 },
    { id: 'backflip', name: 'Mortal Acrobático', cost: 1200 }
  ];

  const DIFFICULTIES = [
    { id: 'amador', name: 'Amador', aiSpeed: .84, react: .58, press: .72, shot: .78, desc: 'Ideal para aprender os controles.' },
    { id: 'profissional', name: 'Profissional', aiSpeed: .93, react: .38, press: .9, shot: .9, desc: 'Equilíbrio entre desafio e diversão.' },
    { id: 'lenda', name: 'Lenda', aiSpeed: 1.0, react: .22, press: 1.05, shot: .98, desc: 'A IA joga como se fosse final de copa.' }
  ];

  const COMPETITIONS = [
    ...LEAGUE_DEFS.map(l => ({ id: l.id, name: l.name, type: 'league', leagueId: l.id, pool: l.id, region: l.country, flag: l.flag, desc: l.desc, color: '#35e6ff' })),
    { id: 'libertadores', name: 'Copa Libertadores', type: 'cup', pool: 'southamerica', size: 16, region: 'América do Sul', flag: 'CON', desc: 'A glória eterna da América do Sul. Mata-mata de 16 clubes.', color: '#21ef92' },
    { id: 'champions', name: 'UEFA Champions League', type: 'cup', pool: 'europe', size: 16, region: 'Europa', flag: 'UEFA', desc: 'Os gigantes europeus em noites mágicas de mata-mata.', color: '#4d8dff' },
    { id: 'copabrasil', name: 'Copa do Brasil', type: 'cup', pool: 'brazil', size: 16, region: 'Brasil', flag: 'BRA', desc: 'O mata-mata mais imprevisível do calendário brasileiro.', color: '#c9ff3d' },
    { id: 'mundial', name: 'Copa do Mundo', type: 'cup', pool: 'national', size: 16, region: 'Mundo', flag: 'FIFA', desc: 'As 16 melhores seleções do planeta em busca da taça.', color: '#f5b324' },
    { id: 'copaamerica', name: 'Copa América', type: 'cup', pool: 'southamericaNational', size: 16, region: 'América do Sul', flag: 'CON', desc: 'Seleções sul-americanas em duelo de tradição.', color: '#ff9d3d' },
    { id: 'euro', name: 'Eurocopa', type: 'cup', pool: 'europeNational', size: 16, region: 'Europa', flag: 'UEFA', desc: 'A elite das seleções europeias em jogo.', color: '#ff3d82' },
    { id: 'torneio', name: 'Torneio Relâmpago', type: 'cup', pool: 'all', size: 8, region: 'Mundial', flag: 'PES', desc: 'Oito clubes, três jogos, um campeão. Crie seu torneio.', color: '#c9ff3d' }
  ];

  const state = { teams: new Map(), leagues: [], allTeams: [], nationalTeams: [], edits: {} };

  LEAGUE_DEFS.forEach(l => {
    const league = { id: l.id, name: l.name, country: l.country, flag: l.flag, region: l.region, confed: l.confed, desc: l.desc, teams: [] };
    l.teams.forEach((t, i) => {
      const id = `${l.id}-${slug(t.name)}`;
      const team = {
        id, leagueId: l.id, leagueName: l.name, name: t.name, short: t.short, city: t.city,
        country: l.country, flag: l.flag, region: l.region, confed: l.confed,
        colors: { primary: t.c1, secondary: t.c2, accent: t.c3, shorts: t.c2, socks: t.c1 },
        stadium: t.stadium, rating: t.rating, formation: ['4-3-3', '4-2-3-1', '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-4-2'][i % 8],
        crestSeed: hash(id), isNational: false
      };
      league.teams.push(team);
      state.teams.set(id, team);
      state.allTeams.push(team);
    });
    state.leagues.push(league);
  });

  NATIONAL_TEAMS.forEach((n, i) => {
    const [name, short, country, c1, c2, c3, stadium, rating, region] = n;
    const id = `national-${short.toLowerCase()}`;
    const team = {
      id, leagueId: 'national', leagueName: 'Seleções', name, short, city: country, country,
      flag: short, region, confed: region === 'europe' ? 'UEFA' : region === 'southamerica' ? 'CONMEBOL' : region === 'asia' ? 'AFC' : region === 'africa' ? 'CAF' : 'CONCACAF',
      colors: { primary: c1, secondary: c2, accent: c3, shorts: c2, socks: c1 },
      stadium, rating, formation: ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'][i % 4],
      crestSeed: hash(id), isNational: true
    };
    state.teams.set(id, team);
    state.nationalTeams.push(team);
    state.allTeams.push(team);
  });

  const squadCache = new Map();

  function makePlayer(team, index, r, leagueKey) {
    const pool = NAME_POOLS[leagueKey] || NAME_POOLS.intl;
    const used = squadCache.get(team.id) || new Set();
    let name = '';
    for (let tries = 0; tries < 40; tries++) {
      const fn = pick(r, pool.first);
      const ln = pick(r, pool.last);
      name = `${fn} ${ln}`;
      if (!used.has(name)) break;
    }
    used.add(name);
    squadCache.set(team.id, used);
    const pos = SQUAD_POSITIONS[index];
    const role = pos === 'W' ? (index % 2 ? 'LW' : 'RW') : pos;
    const base = team.rating + (r() * 9 - 4) - (index > 12 ? 3 : 0);
    let ovr = Math.round(clamp(base, 55, 95));
    if (index < 2) ovr = Math.round(clamp(team.rating - 3 + r() * 5, 56, 92));
    const age = 18 + Math.floor(r() * 17);
    const growth = age < 23 ? 3 : age > 32 ? -3 : 0;
    const isGK = role === 'GK';
    const defBase = isGK ? ovr : ['CB', 'LB', 'RB', 'DM'].includes(role) ? ovr + 4 : role === 'CM' ? ovr : ovr - 10;
    const attBase = ['ST', 'LW', 'RW', 'AM'].includes(role) ? ovr + 4 : role === 'CM' ? ovr : ovr - 8;
    const p = {
      id: `${team.id}-p${index}`, teamId: team.id,
      name, number: index === 0 ? 1 : index === 1 ? 12 : 2 + Math.floor(r() * 49),
      pos: role, ovr, age, nationality: team.country, growth,
      pac: Math.round(clamp(ovr - 4 + r() * 14 + (['LW', 'RW', 'ST', 'LB', 'RB'].includes(role) ? 5 : 0), 40, 97)),
      sho: Math.round(clamp(attBase - 2 + r() * 10, 30, 96)),
      pas: Math.round(clamp(ovr - 3 + r() * 12 + (['CM', 'AM', 'DM'].includes(role) ? 4 : 0), 35, 96)),
      dri: Math.round(clamp(ovr - 5 + r() * 14 + (['ST', 'LW', 'RW', 'AM'].includes(role) ? 4 : 0), 35, 97)),
      def: Math.round(clamp(defBase - 2 + r() * 8, 25, 95)),
      phy: Math.round(clamp(ovr - 6 + r() * 16 + (role === 'CB' ? 5 : 0), 40, 96)),
      sta: Math.round(clamp(66 + r() * 31, 60, 96)),
      value: 0, wage: 0, form: 0, fitness: 100, morale: 80, injured: 0
    };
    const posMult = ['ST', 'AM', 'RW', 'LW'].includes(role) ? 1.35 : isGK ? .72 : ['CB', 'LB', 'RB', 'DM'].includes(role) ? .94 : 1.08;
    p.value = Math.round(((ovr - 45) ** 2 * 46000 + (age < 24 ? 2800000 : age > 31 ? -900000 : 0)) * posMult / 100000) * 100000 / 1000000;
    p.value = Math.max(0.15, Math.round(p.value * 10) / 10);
    p.wage = Math.max(4, Math.round(p.value * 0.09 * 10) / 10);
    return p;
  }

  function buildSquad(team) {
    if (!squadCache.has('squad:' + team.id)) {
      const r = rnd(team.crestSeed);
      const leagueKey = team.isNational ? (team.short === 'BRA' ? 'br' : team.short === 'ARG' || team.short === 'URU' || team.short === 'COL' ? 'ar' : team.short === 'MEX' ? 'mx' : team.short === 'USA' ? 'us' : 'intl') : (LEAGUE_POOL[team.leagueId] || 'intl');
      const squad = SQUAD_POSITIONS.map((p, i) => makePlayer(team, i, r, leagueKey));
      squad.forEach((p, i) => { if (i > 0 && p.number === 1) p.number = 13 + i; });
      squadCache.set('squad:' + team.id, squad);
    }
    return squadCache.get('squad:' + team.id);
  }

  function effectiveTeam(team) {
    const e = state.edits.teams && state.edits.teams[team.id];
    if (!e) return team;
    return {
      ...team,
      name: e.name || team.name, short: e.short || team.short, city: e.city || team.city,
      stadium: e.stadium || team.stadium, formation: e.formation || team.formation,
      colors: { ...team.colors, ...(e.colors || {}) }
    };
  }

  function effectivePlayer(p) {
    const e = state.edits.players && state.edits.players[p.id];
    return e ? { ...p, ...e } : p;
  }

  function getTeam(id) {
    const t = state.teams.get(id);
    return t ? effectiveTeam(t) : null;
  }

  function getSquad(id) {
    const t = state.teams.get(id);
    if (!t) return [];
    return buildSquad(t).map(effectivePlayer).concat(
      (state.edits.customPlayers || []).filter(p => p.teamId === id).map(p => ({ ...p }))
    );
  }

  function applyEdits(edits) { state.edits = edits || {}; }

  function autoLineup(team, squad) {
    const formation = FORMATIONS[team.formation] || FORMATIONS['4-3-3'];
    const pool = squad.slice();
    const lineup = [];
    formation.forEach(slot => {
      const role = slot[0];
      const wanted = ROLE_GROUP[role] || [role];
      let bestIdx = -1, bestScore = -1;
      pool.forEach((p, i) => {
        let score = -1;
        if (role === 'GK' && p.pos !== 'GK') score = -20;
        if (p.pos !== 'GK' && role === 'GK') score = -50;
        const groupIdx = wanted.indexOf(p.pos);
        if (groupIdx === 0) score = 100;
        else if (groupIdx > 0) score = 80 - groupIdx * 5;
        else score = 40;
        score += p.ovr * .3;
        if (score > bestScore) { bestScore = score; bestIdx = i; }
      });
      if (bestIdx >= 0) {
        const p = pool.splice(bestIdx, 1)[0];
        lineup.push({ ...p, slot: role, x: slot[1], y: slot[2] });
      }
    });
    while (lineup.length < 11 && pool.length) {
      const p = pool.shift();
      lineup.push({ ...p, slot: p.pos, x: .3 + lineup.length * .03, y: .2 + lineup.length * .05 });
    }
    return { lineup, bench: pool };
  }

  function teamRating(team) { return Math.round(team.rating); }

  function poolFor(poolId, size, seed) {
    let arr = [];
    if (poolId === 'national') arr = state.nationalTeams.slice();
    else if (poolId === 'southamericaNational') arr = state.nationalTeams.filter(t => t.region === 'southamerica');
    else if (poolId === 'europeNational') arr = state.nationalTeams.filter(t => t.region === 'europe');
    else if (poolId === 'southamerica') arr = state.allTeams.filter(t => t.region === 'southamerica' && !t.isNational);
    else if (poolId === 'europe') arr = state.allTeams.filter(t => t.region === 'europe' && !t.isNational);
    else if (poolId === 'brazil') arr = state.allTeams.filter(t => t.leagueId === 'brasileirao');
    else if (poolId === 'all') arr = state.allTeams.filter(t => !t.isNational);
    else arr = state.allTeams.filter(t => t.leagueId === poolId);
    if (poolId === 'europe' || poolId === 'southamerica') {
      const byLeague = new Map();
      arr.forEach(t => { if (!byLeague.has(t.leagueId)) byLeague.set(t.leagueId, []); byLeague.get(t.leagueId).push(t); });
      const top = [];
      byLeague.forEach(list => list.sort((a, b) => b.rating - a.rating).slice(0, 4).forEach(t => top.push(t)));
      arr = top.concat(arr.filter(t => !top.includes(t)));
    }
    const r = rnd(seed || 918273);
    arr = arr.slice().sort((a, b) => b.rating - a.rating);
    const top = arr.slice(0, Math.min(arr.length, Math.ceil(size * .75)));
    const rest = arr.slice(top.length);
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    let out = top.concat(rest).slice(0, size);
    // ensure size using repeats of best teams if pool is smaller
    let i = 0;
    while (out.length < size && arr.length) { out.push(arr[i % arr.length]); i++; }
    for (let k = out.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; }
    return out;
  }

  function getCompetition(id) { return COMPETITIONS.find(c => c.id === id); }
  function getLeague(id) { return state.leagues.find(l => l.id === id); }
  function leagueOfTeam(id) {
    const t = getTeam(id);
    return t ? getLeague(t.leagueId) : null;
  }

  function form(teamId) { return getTeam(teamId) ? getTeam(teamId).formation : '4-3-3'; }

  function buildMarket() {
    if (state.market) return state.market;
    const all = [];
    state.allTeams.filter(t => !t.isNational).forEach(t => {
      getSquad(t.id).forEach(p => all.push({ ...p, clubId: t.id, clubName: getTeam(t.id).name }));
    });
    all.sort((a, b) => b.ovr - a.ovr || b.value - a.value);
    state.market = all;
    return all;
  }

  window.PES = {
    clamp, rnd, hash, pick, slug, FORMATIONS, ROLE_GROUP, STADIUMS, BALLS, KITS, CELEBRATIONS,
    DIFFICULTIES, COMPETITIONS, LEAGUES: state.leagues, NATIONAL_TEAMS, NAME_POOLS,
    get teams() { return state.allTeams; },
    get nationalTeams() { return state.nationalTeams; },
    get teamMap() { return state.teams; },
    getTeam, getSquad, getLeague, getCompetition, leagueOfTeam, applyEdits, autoLineup, teamRating,
    poolFor, buildMarket, form,
    allPlayers() { return buildMarket(); }
  };
})();
