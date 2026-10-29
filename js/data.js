import { RNG, clamp, slug, escapeHtml, hashSeed, pick, textColor, shade, mix } from './util.js';

export const GAME_VERSION = '1.0.0';
export const SAVE_VERSION = 3;

export const POS_GROUP = { GOL: 'GOL', ZAG: 'DEF', LAT: 'DEF', VOL: 'MEI', MEI: 'MEI', PON: 'ATA', ATA: 'ATA' };
export const GROUP_LABEL = { GOL: 'Goleiro', DEF: 'Defensor', MEI: 'Meio-campo', ATA: 'Atacante' };

export const FORMATIONS = {
  '4-4-2': {
    name: '4-4-2', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'LAT', x: 0.20, y: 0.14 }, { pos: 'ZAG', x: 0.16, y: 0.38 }, { pos: 'ZAG', x: 0.16, y: 0.62 }, { pos: 'LAT', x: 0.20, y: 0.86 },
      { pos: 'MEI', x: 0.43, y: 0.14 }, { pos: 'VOL', x: 0.40, y: 0.40 }, { pos: 'VOL', x: 0.40, y: 0.60 }, { pos: 'MEI', x: 0.43, y: 0.86 },
      { pos: 'ATA', x: 0.67, y: 0.38 }, { pos: 'ATA', x: 0.67, y: 0.62 }
    ]
  },
  '4-3-3': {
    name: '4-3-3', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'LAT', x: 0.20, y: 0.13 }, { pos: 'ZAG', x: 0.16, y: 0.38 }, { pos: 'ZAG', x: 0.16, y: 0.62 }, { pos: 'LAT', x: 0.20, y: 0.87 },
      { pos: 'MEI', x: 0.42, y: 0.30 }, { pos: 'VOL', x: 0.38, y: 0.50 }, { pos: 'MEI', x: 0.42, y: 0.70 },
      { pos: 'PON', x: 0.68, y: 0.16 }, { pos: 'ATA', x: 0.72, y: 0.50 }, { pos: 'PON', x: 0.68, y: 0.84 }
    ]
  },
  '4-2-3-1': {
    name: '4-2-3-1', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'LAT', x: 0.20, y: 0.13 }, { pos: 'ZAG', x: 0.16, y: 0.38 }, { pos: 'ZAG', x: 0.16, y: 0.62 }, { pos: 'LAT', x: 0.20, y: 0.87 },
      { pos: 'VOL', x: 0.38, y: 0.40 }, { pos: 'VOL', x: 0.38, y: 0.60 },
      { pos: 'PON', x: 0.58, y: 0.17 }, { pos: 'MEI', x: 0.58, y: 0.50 }, { pos: 'PON', x: 0.58, y: 0.83 },
      { pos: 'ATA', x: 0.74, y: 0.50 }
    ]
  },
  '3-5-2': {
    name: '3-5-2', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'ZAG', x: 0.17, y: 0.28 }, { pos: 'ZAG', x: 0.15, y: 0.50 }, { pos: 'ZAG', x: 0.17, y: 0.72 },
      { pos: 'LAT', x: 0.40, y: 0.10 }, { pos: 'MEI', x: 0.38, y: 0.35 }, { pos: 'VOL', x: 0.35, y: 0.50 }, { pos: 'MEI', x: 0.38, y: 0.65 }, { pos: 'LAT', x: 0.40, y: 0.90 },
      { pos: 'ATA', x: 0.68, y: 0.38 }, { pos: 'ATA', x: 0.68, y: 0.62 }
    ]
  },
  '4-5-1': {
    name: '4-5-1', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'LAT', x: 0.20, y: 0.13 }, { pos: 'ZAG', x: 0.16, y: 0.38 }, { pos: 'ZAG', x: 0.16, y: 0.62 }, { pos: 'LAT', x: 0.20, y: 0.87 },
      { pos: 'PON', x: 0.40, y: 0.12 }, { pos: 'MEI', x: 0.38, y: 0.34 }, { pos: 'VOL', x: 0.36, y: 0.50 }, { pos: 'MEI', x: 0.38, y: 0.66 }, { pos: 'PON', x: 0.40, y: 0.88 },
      { pos: 'ATA', x: 0.70, y: 0.50 }
    ]
  },
  '3-4-3': {
    name: '3-4-3', slots: [
      { pos: 'GOL', x: 0.045, y: 0.50 },
      { pos: 'ZAG', x: 0.17, y: 0.28 }, { pos: 'ZAG', x: 0.15, y: 0.50 }, { pos: 'ZAG', x: 0.17, y: 0.72 },
      { pos: 'LAT', x: 0.42, y: 0.12 }, { pos: 'VOL', x: 0.38, y: 0.40 }, { pos: 'VOL', x: 0.38, y: 0.60 }, { pos: 'LAT', x: 0.42, y: 0.88 },
      { pos: 'PON', x: 0.68, y: 0.18 }, { pos: 'ATA', x: 0.72, y: 0.50 }, { pos: 'PON', x: 0.68, y: 0.82 }
    ]
  }
};

export const LEAGUES = [
  { id: 'brasileirao', name: 'Brasileirão Série A', country: 'Brasil', flag: '🇧🇷', base: 76, region: 'brazil', teams: ['Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Fluminense', 'Botafogo', 'Vasco da Gama', 'Grêmio', 'Internacional', 'Cruzeiro', 'Atlético Mineiro', 'Bahia', 'Fortaleza', 'Sport Recife', 'Ceará', 'Vitória', 'Juventude', 'Mirassol', 'Santos', 'Red Bull Bragantino'] },
  { id: 'brasileirao-b', name: 'Brasileirão Série B', country: 'Brasil', flag: '🇧🇷', base: 67, region: 'brazil', teams: ['Coritiba', 'Athletico Paranaense', 'Cuiabá', 'Goiás', 'Chapecoense', 'Avaí', 'Amazonas', 'Novorizontino', 'Operário', 'Paysandu', 'Remo', 'América Mineiro', 'Athletic', 'Botafogo-SP', 'CRB', 'Ferroviária', 'Criciúma', 'Vila Nova', 'Volta Redonda', 'Atlético-GO'] },
  { id: 'premier', name: 'Premier League', country: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', base: 80, region: 'europe', teams: ['Arsenal', 'Manchester City', 'Liverpool', 'Chelsea', 'Manchester United', 'Tottenham', 'Newcastle', 'Aston Villa', 'Brighton', 'West Ham', 'Crystal Palace', 'Everton', 'Fulham', 'Brentford', 'Nottingham Forest', 'Bournemouth', 'Wolverhampton', 'Leeds United', 'Burnley', 'Sunderland'] },
  { id: 'laliga', name: 'La Liga', country: 'Espanha', flag: '🇪🇸', base: 79, region: 'europe', teams: ['Real Madrid', 'Barcelona', 'Atlético de Madrid', 'Athletic Club', 'Villarreal', 'Real Sociedad', 'Real Betis', 'Sevilla', 'Valencia', 'Girona', 'Celta de Vigo', 'Osasuna', 'Mallorca', 'Getafe', 'Rayo Vallecano', 'Alavés', 'Espanyol', 'Elche', 'Levante', 'Real Oviedo'] },
  { id: 'seriea', name: 'Serie A', country: 'Itália', flag: '🇮🇹', base: 79, region: 'europe', teams: ['Inter de Milão', 'Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'Bologna', 'Torino', 'Udinese', 'Genoa', 'Como', 'Cagliari', 'Lecce', 'Parma', 'Sassuolo', 'Verona', 'Pisa', 'Cremonese'] },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Alemanha', flag: '🇩🇪', base: 79, region: 'europe', teams: ['Bayern de Munique', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig', 'Eintracht Frankfurt', 'Stuttgart', 'Wolfsburg', 'Freiburg', 'Werder Bremen', 'Mainz', 'Augsburg', 'Mönchengladbach', 'Hoffenheim', 'Union Berlin', 'St. Pauli', 'Heidenheim', 'Colônia', 'Hamburgo'] },
  { id: 'ligue1', name: 'Ligue 1', country: 'França', flag: '🇫🇷', base: 78, region: 'europe', teams: ['PSG', 'Marselha', 'Mônaco', 'Lyon', 'Lille', 'Nice', 'Lens', 'Rennes', 'Strasbourg', 'Nantes', 'Brest', 'Toulouse', 'Auxerre', 'Angers', 'Le Havre', 'Lorient', 'Metz', 'Paris FC'] },
  { id: 'primeira', name: 'Primeira Liga', country: 'Portugal', flag: '🇵🇹', base: 74, region: 'europe', teams: ['Benfica', 'Porto', 'Sporting', 'Braga', 'Vitória de Guimarães', 'Santa Clara', 'Famalicão', 'Moreirense', 'Estoril', 'Rio Ave', 'Arouca', 'Gil Vicente', 'Casa Pia', 'Nacional', 'Estrela Amadora', 'Alverca', 'Tondela', 'AVS'] },
  { id: 'eredivisie', name: 'Eredivisie', country: 'Holanda', flag: '🇳🇱', base: 74, region: 'europe', teams: ['Ajax', 'PSV', 'Feyenoord', 'AZ Alkmaar', 'Twente', 'Utrecht', 'Sparta Rotterdam', 'Go Ahead Eagles', 'NEC', 'Heerenveen', 'Fortuna Sittard', 'Groningen', 'Zwolle', 'Heracles', 'Excelsior', 'Telstar', 'Volendam', 'NAC Breda'] },
  { id: 'ligamx', name: 'Liga MX', country: 'México', flag: '🇲🇽', base: 72, region: 'america', teams: ['América', 'Monterrey', 'Tigres', 'Cruz Azul', 'Guadalajara', 'Pumas', 'Toluca', 'León', 'Pachuca', 'Atlas', 'Santos Laguna', 'Necaxa', 'Puebla', 'Querétaro', 'Mazatlán', 'Juárez', 'Tijuana', 'San Luis'] },
  { id: 'argentina', name: 'Liga Profesional', country: 'Argentina', flag: '🇦🇷', base: 72, region: 'america', teams: ['River Plate', 'Boca Juniors', 'Racing', 'Independiente', 'San Lorenzo', 'Vélez', 'Estudiantes', 'Gimnasia', 'Huracán', 'Lanús', 'Argentinos Juniors', 'Defensa y Justicia', 'Talleres', 'Belgrano', 'Rosario Central', 'Newell\'s', 'Colón', 'Unión', 'Banfield', 'Tigre'] },
  { id: 'mls', name: 'Major League Soccer', country: 'EUA', flag: '🇺🇸', base: 70, region: 'america', teams: ['Inter Miami', 'LA Galaxy', 'Los Angeles FC', 'Seattle Sounders', 'Atlanta United', 'New York City', 'New York Red Bulls', 'Columbus Crew', 'Philadelphia Union', 'Orlando City', 'Toronto FC', 'CF Montréal', 'Austin FC', 'FC Dallas', 'Portland Timbers', 'Vancouver Whitecaps'] },
  { id: 'saudi', name: 'Saudi Pro League', country: 'Arábia Saudita', flag: '🇸🇦', base: 73, region: 'asia', teams: ['Al-Hilal', 'Al-Nassr', 'Al-Ittihad', 'Al-Ahli', 'Al-Shabab', 'Al-Ettifaq', 'Al-Taawoun', 'Al-Fateh', 'Al-Fayha', 'Damac', 'Al-Riyadh', 'Al-Khaleej', 'Al-Okhdood', 'Al-Najma', 'Al-Qadsiah', 'Al-Kholood', 'Al-Raed', 'Al-Wehda'] }
];

export const NATION_DEFS = [
  ['Brasil', 'BRA', '🇧🇷', 88, '#ffd200', '#009739', '#012169'],
  ['Argentina', 'ARG', '🇦🇷', 87, '#75aadb', '#ffffff', '#0b3d91'],
  ['França', 'FRA', '🇫🇷', 87, '#1f3f8f', '#ffffff', '#d61f2c'],
  ['Espanha', 'ESP', '🇪🇸', 86, '#c60b1e', '#ffc400', '#7a0712'],
  ['Inglaterra', 'ING', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 86, '#ffffff', '#cf142b', '#0b2f6b'],
  ['Alemanha', 'ALE', '🇩🇪', 85, '#ffffff', '#111111', '#dd0000'],
  ['Portugal', 'POR', '🇵🇹', 85, '#c8102e', '#006847', '#ffd200'],
  ['Holanda', 'HOL', '🇳🇱', 84, '#ff6a13', '#ffffff', '#0b2f6b'],
  ['Itália', 'ITA', '🇮🇹', 84, '#1f4fa8', '#ffffff', '#d4af37'],
  ['Bélgica', 'BEL', '🇧🇪', 83, '#e30613', '#ffd700', '#111111'],
  ['Croácia', 'CRO', '🇭🇷', 82, '#ff0000', '#ffffff', '#171796'],
  ['Uruguai', 'URU', '🇺🇾', 82, '#5cbfeb', '#ffffff', '#0b2f6b'],
  ['Colômbia', 'COL', '🇨🇴', 81, '#fcd116', '#003893', '#ce1126'],
  ['México', 'MEX', '🇲🇽', 80, '#006847', '#ffffff', '#ce1126'],
  ['EUA', 'EUA', '🇺🇸', 79, '#ffffff', '#0a3161', '#b31942'],
  ['Marrocos', 'MAR', '🇲🇦', 80, '#c1272d', '#006233', '#ffd700'],
  ['Senegal', 'SEN', '🇸🇳', 79, '#00853f', '#fdef42', '#e31b23'],
  ['Japão', 'JAP', '🇯🇵', 79, '#0b2f6b', '#ffffff', '#bc002d'],
  ['Coreia do Sul', 'COR', '🇰🇷', 77, '#ffffff', '#cd2e3a', '#0047a0'],
  ['Chile', 'CHI', '🇨🇱', 77, '#d52b1e', '#ffffff', '#0039a6'],
  ['Peru', 'PER', '🇵🇪', 76, '#ffffff', '#d91023', '#111111'],
  ['Equador', 'EQU', '🇪🇨', 77, '#ffdd00', '#034ea2', '#ed1c24'],
  ['Paraguai', 'PAR', '🇵🇾', 75, '#d52b1e', '#ffffff', '#0038a8'],
  ['Nigéria', 'NIG', '🇳🇬', 76, '#008751', '#ffffff', '#111111']
];

export const CLASSIC_DEFS = [
  { id: 'classic-brasil-1970', name: 'Brasil 1970', short: 'BRA70', flag: '🇧🇷', rating: 94, colors: ['#ffd200', '#009739', '#012169'] },
  { id: 'classic-brasil-2002', name: 'Brasil 2002', short: 'BRA02', flag: '🇧🇷', rating: 94, colors: ['#ffd200', '#009739', '#012169'] },
  { id: 'classic-argentina-1986', name: 'Argentina 1986', short: 'ARG86', flag: '🇦🇷', rating: 93, colors: ['#75aadb', '#ffffff', '#0b3d91'] },
  { id: 'classic-franca-1998', name: 'França 1998', short: 'FRA98', flag: '🇫🇷', rating: 93, colors: ['#1f3f8f', '#ffffff', '#d61f2c'] },
  { id: 'classic-italia-1982', name: 'Itália 1982', short: 'ITA82', flag: '🇮🇹', rating: 92, colors: ['#1f4fa8', '#ffffff', '#d4af37'] },
  { id: 'classic-milan-1990', name: 'Milan 1990', short: 'MIL90', flag: '🇮🇹', rating: 94, colors: ['#d50022', '#111111', '#ffffff'] },
  { id: 'classic-barcelona-2011', name: 'Barcelona 2011', short: 'BAR11', flag: '🇪🇸', rating: 95, colors: ['#a50044', '#004d98', '#ffcb05'] },
  { id: 'classic-real-2014', name: 'Real Madrid 2014', short: 'RMA14', flag: '🇪🇸', rating: 94, colors: ['#ffffff', '#d4af37', '#1f5fbf'] }
];

export const STADIUMS = [
  { id: 'estadio-nacional', name: 'Estádio Nacional', city: 'Cidade', capacity: 50000, theme: 'modern', free: true },
  { id: 'maracana', name: 'Maracanã', city: 'Rio de Janeiro', capacity: 78000, theme: 'classic', free: true },
  { id: 'morumbi', name: 'Morumbi', city: 'São Paulo', capacity: 66000, theme: 'classic', free: true },
  { id: 'mineirao', name: 'Mineirão', city: 'Belo Horizonte', capacity: 61000, theme: 'modern', free: true },
  { id: 'arena-corinthians', name: 'Neo Química Arena', city: 'São Paulo', capacity: 49000, theme: 'modern', free: true },
  { id: 'allianz-parque', name: 'Allianz Parque', city: 'São Paulo', capacity: 43000, theme: 'modern', free: true },
  { id: 'santiago-bernabeu', name: 'Santiago Bernabéu', city: 'Madri', capacity: 81000, theme: 'elite', free: false },
  { id: 'camp-nou', name: 'Camp Nou', city: 'Barcelona', capacity: 99000, theme: 'elite', free: false },
  { id: 'san-siro', name: 'San Siro', city: 'Milão', capacity: 75000, theme: 'classic', free: false },
  { id: 'old-trafford', name: 'Old Trafford', city: 'Manchester', capacity: 74000, theme: 'classic', free: false },
  { id: 'anfield', name: 'Anfield', city: 'Liverpool', capacity: 61000, theme: 'classic', free: false },
  { id: 'wembley', name: 'Wembley', city: 'Londres', capacity: 90000, theme: 'elite', free: false },
  { id: 'signal-iduna', name: 'Signal Iduna Park', city: 'Dortmund', capacity: 81000, theme: 'modern', free: false },
  { id: 'la-bombonera', name: 'La Bombonera', city: 'Buenos Aires', capacity: 54000, theme: 'classic', free: false },
  { id: 'azteca', name: 'Estádio Azteca', city: 'Cidade do México', capacity: 87000, theme: 'elite', free: false },
  { id: 'moulay-abdellah', name: 'Moulay Abdellah', city: 'Rabat', capacity: 68000, theme: 'modern', free: false }
];

export const UNLOCKABLES = [
  { id: 'stadium-santiago-bernabeu', kind: 'stadium', ref: 'santiago-bernabeu', name: 'Santiago Bernabéu', desc: 'Palco de 15 Champions League.', price: 3000, icon: '🏟️' },
  { id: 'stadium-camp-nou', kind: 'stadium', ref: 'camp-nou', name: 'Camp Nou', desc: 'O maior estádio da Europa.', price: 3200, icon: '🏟️' },
  { id: 'stadium-san-siro', kind: 'stadium', ref: 'san-siro', name: 'San Siro', desc: 'A casa do futebol italiano.', price: 2600, icon: '🏟️' },
  { id: 'stadium-old-trafford', kind: 'stadium', ref: 'old-trafford', name: 'Old Trafford', desc: 'O Teatro dos Sonhos.', price: 2600, icon: '🏟️' },
  { id: 'stadium-anfield', kind: 'stadium', ref: 'anfield', name: 'Anfield', desc: 'You\'ll Never Walk Alone.', price: 2400, icon: '🏟️' },
  { id: 'stadium-wembley', kind: 'stadium', ref: 'wembley', name: 'Wembley', desc: 'A casa da seleção inglesa.', price: 2800, icon: '🏟️' },
  { id: 'stadium-signal-iduna', kind: 'stadium', ref: 'signal-iduna', name: 'Signal Iduna Park', desc: 'A Muralha Amarela.', price: 2500, icon: '🏟️' },
  { id: 'stadium-la-bombonera', kind: 'stadium', ref: 'la-bombonera', name: 'La Bombonera', desc: 'O caldeirão de Buenos Aires.', price: 2600, icon: '🏟️' },
  { id: 'stadium-azteca', kind: 'stadium', ref: 'azteca', name: 'Estádio Azteca', desc: 'A altitude joga junto.', price: 3000, icon: '🏟️' },
  { id: 'stadium-moulay-abdellah', kind: 'stadium', ref: 'moulay-abdellah', name: 'Moulay Abdellah', desc: 'A nova fortaleza africana.', price: 2200, icon: '🏟️' },
  { id: 'team-classic-brasil-1970', kind: 'team', ref: 'classic-brasil-1970', name: 'Brasil 1970', desc: 'O futebol arte em sua forma máxima.', price: 6500, icon: '🏆' },
  { id: 'team-classic-brasil-2002', kind: 'team', ref: 'classic-brasil-2002', name: 'Brasil 2002', desc: 'Penta, com R9 no comando.', price: 6000, icon: '🏆' },
  { id: 'team-classic-argentina-1986', kind: 'team', ref: 'classic-argentina-1986', name: 'Argentina 1986', desc: 'A Copa de um gênio.', price: 6000, icon: '🏆' },
  { id: 'team-classic-franca-1998', kind: 'team', ref: 'classic-franca-1998', name: 'França 1998', desc: 'Campeões em casa.', price: 5500, icon: '🏆' },
  { id: 'team-classic-italia-1982', kind: 'team', ref: 'classic-italia-1982', name: 'Itália 1982', desc: 'Azzurra campeã do mundo.', price: 5500, icon: '🏆' },
  { id: 'team-classic-milan-1990', kind: 'team', ref: 'classic-milan-1990', name: 'Milan 1990', desc: 'Os imortais de San Siro.', price: 5800, icon: '🏆' },
  { id: 'team-classic-barcelona-2011', kind: 'team', ref: 'classic-barcelona-2011', name: 'Barcelona 2011', desc: 'Tiki-taka no auge.', price: 7000, icon: '🏆' },
  { id: 'team-classic-real-2014', kind: 'team', ref: 'classic-real-2014', name: 'Real Madrid 2014', desc: 'A Décima.', price: 6800, icon: '🏆' },
  { id: 'kit-retro', kind: 'kit', ref: 'retro', name: 'Uniformes Retrô', desc: 'Padrões clássicos para todos os times.', price: 1500, icon: '👕' },
  { id: 'kit-neon', kind: 'kit', ref: 'neon', name: 'Uniformes Neon', desc: 'Brilhe sob as luzes do estádio.', price: 1800, icon: '👕' },
  { id: 'kit-camo', kind: 'kit', ref: 'camo', name: 'Uniformes Camuflados', desc: 'Camuflagem tática em campo.', price: 2000, icon: '👕' },
  { id: 'celebration-confetti', kind: 'celebration', ref: 'confetti', name: 'Chuva de Confete', desc: 'Comemore cada gol em grande estilo.', price: 1200, icon: '🎉' },
  { id: 'celebration-fireworks', kind: 'celebration', ref: 'fireworks', name: 'Fogos de Artifício', desc: 'Gols com show pirotécnico.', price: 2200, icon: '🎆' },
  { id: 'commentary-epic', kind: 'commentary', ref: 'epic', name: 'Narração Épica', desc: 'Uma voz mais intensa para grandes momentos.', price: 1400, icon: '🎙️' },
  { id: 'slot-extra', kind: 'slot', ref: 'extra', name: 'Save Extra', desc: 'Libera um quarto slot de salvamento.', price: 2500, icon: '💾' }
];

export const DEFAULT_SETTINGS = {
  music: 0.45, sfx: 0.8, crowd: 0.65, commentary: 0.85,
  commentaryOn: true, difficulty: 2, camera: 'dynamic', weather: 'auto',
  time: 360, quality: 'auto', tilt: false, haptics: true, autoReplay: true,
  powerMode: 'hold', language: 'pt-BR', stadium: 'estadio-nacional'
};

const TEAM_COLORS = {
  'Flamengo': ['#c8102e', '#111111', '#ffffff'], 'Palmeiras': ['#006437', '#ffffff', '#d9d9d9'],
  'Corinthians': ['#111111', '#ffffff', '#c8c8c8'], 'São Paulo': ['#ffffff', '#c8102e', '#111111'],
  'Fluminense': ['#7a1f3d', '#00694a', '#ffffff'], 'Botafogo': ['#111111', '#ffffff', '#d0d0d0'],
  'Vasco da Gama': ['#111111', '#ffffff', '#c8102e'], 'Grêmio': ['#0d80bf', '#111111', '#ffffff'],
  'Internacional': ['#c8102e', '#ffffff', '#111111'], 'Cruzeiro': ['#1b3f94', '#ffffff', '#d4af37'],
  'Atlético Mineiro': ['#111111', '#ffffff', '#d4af37'], 'Bahia': ['#1b4fa0', '#c8102e', '#ffffff'],
  'Fortaleza': ['#1b3f94', '#c8102e', '#ffffff'], 'Sport Recife': ['#c8102e', '#111111', '#ffffff'],
  'Ceará': ['#111111', '#ffffff', '#c8102e'], 'Vitória': ['#c8102e', '#111111', '#ffffff'],
  'Juventude': ['#0b6e3f', '#ffffff', '#111111'], 'Mirassol': ['#f2b705', '#0b6e3f', '#ffffff'],
  'Santos': ['#ffffff', '#111111', '#c8c8c8'], 'Red Bull Bragantino': ['#ffffff', '#c8102e', '#111111'],
  'Coritiba': ['#0b6e3f', '#ffffff', '#111111'], 'Athletico Paranaense': ['#c8102e', '#111111', '#ffffff'],
  'Cuiabá': ['#0b6e3f', '#f2b705', '#ffffff'], 'Goiás': ['#0b6e3f', '#ffffff', '#111111'],
  'Chapecoense': ['#0b6e3f', '#ffffff', '#111111'], 'Avaí': ['#1b4fa0', '#f2b705', '#ffffff'],
  'Amazonas': ['#f2b705', '#0b6e3f', '#111111'], 'Novorizontino': ['#f2b705', '#111111', '#ffffff'],
  'Operário': ['#111111', '#ffffff', '#f2b705'], 'Paysandu': ['#1b4fa0', '#ffffff', '#111111'],
  'Remo': ['#111111', '#ffffff', '#c8102e'], 'América Mineiro': ['#0b6e3f', '#ffffff', '#111111'],
  'Athletic': ['#111111', '#ffffff', '#c8102e'], 'Botafogo-SP': ['#c8102e', '#111111', '#ffffff'],
  'CRB': ['#c8102e', '#ffffff', '#111111'], 'Ferroviária': ['#c8102e', '#111111', '#d4af37'],
  'Criciúma': ['#f2b705', '#111111', '#ffffff'], 'Vila Nova': ['#0b6e3f', '#ffffff', '#c8102e'],
  'Volta Redonda': ['#f2b705', '#111111', '#ffffff'], 'Atlético-GO': ['#c8102e', '#111111', '#ffffff'],
  'Arsenal': ['#ef0107', '#ffffff', '#063672'], 'Manchester City': ['#6cabdd', '#ffffff', '#1c2c5b'],
  'Liverpool': ['#c8102e', '#ffffff', '#00b2a9'], 'Chelsea': ['#034694', '#ffffff', '#dba111'],
  'Manchester United': ['#da020e', '#ffffff', '#fbe122'], 'Tottenham': ['#ffffff', '#132257', '#c8c8c8'],
  'Newcastle': ['#241f20', '#ffffff', '#41b6e6'], 'Aston Villa': ['#670e36', '#95bfe5', '#ffffff'],
  'Brighton': ['#0057b8', '#ffffff', '#ffcd00'], 'West Ham': ['#7a263a', '#1bb1e7', '#ffffff'],
  'Crystal Palace': ['#1b458f', '#c4122e', '#ffffff'], 'Everton': ['#003399', '#ffffff', '#c8c8c8'],
  'Fulham': ['#ffffff', '#000000', '#c8c8c8'], 'Brentford': ['#e30613', '#ffffff', '#111111'],
  'Nottingham Forest': ['#dd0000', '#ffffff', '#111111'], 'Bournemouth': ['#da291c', '#111111', '#ffffff'],
  'Wolverhampton': ['#fdb913', '#231f20', '#ffffff'], 'Leeds United': ['#ffffff', '#1d428a', '#ffcd00'],
  'Burnley': ['#6c1d45', '#99d6ea', '#ffffff'], 'Sunderland': ['#eb172b', '#ffffff', '#111111'],
  'Real Madrid': ['#ffffff', '#d4af37', '#1f5fbf'], 'Barcelona': ['#a50044', '#004d98', '#ffcb05'],
  'Atlético de Madrid': ['#cb3524', '#ffffff', '#272e61'], 'Athletic Club': ['#ee2523', '#ffffff', '#111111'],
  'Villarreal': ['#ffe667', '#005187', '#ffffff'], 'Real Sociedad': ['#0067b1', '#ffffff', '#ffffff'],
  'Real Betis': ['#00954c', '#ffffff', '#111111'], 'Sevilla': ['#ffffff', '#d90429', '#c8c8c8'],
  'Valencia': ['#ffffff', '#f18e00', '#111111'], 'Girona': ['#cd2534', '#ffffff', '#111111'],
  'Celta de Vigo': ['#8ac3ee', '#ffffff', '#c8102e'], 'Osasuna': ['#d91a21', '#0a346f', '#ffffff'],
  'Mallorca': ['#e20613', '#111111', '#ffffff'], 'Getafe': ['#005999', '#ffffff', '#c8c8c8'],
  'Rayo Vallecano': ['#ffffff', '#e53027', '#111111'], 'Alavés': ['#005eb8', '#ffffff', '#111111'],
  'Espanyol': ['#ffffff', '#007fc8', '#111111'], 'Elche': ['#ffffff', '#0b6e3f', '#111111'],
  'Levante': ['#b4053f', '#0057b8', '#ffffff'], 'Real Oviedo': ['#0057b8', '#ffffff', '#111111'],
  'Inter de Milão': ['#0068a8', '#111111', '#ffffff'], 'Milan': ['#d50022', '#111111', '#ffffff'],
  'Juventus': ['#ffffff', '#111111', '#c8c8c8'], 'Napoli': ['#12a0d7', '#ffffff', '#111111'],
  'Roma': ['#8e1f2f', '#f0bc42', '#ffffff'], 'Lazio': ['#87d8f7', '#ffffff', '#111111'],
  'Atalanta': ['#1e71b8', '#111111', '#ffffff'], 'Fiorentina': ['#5d2a8a', '#ffffff', '#111111'],
  'Bologna': ['#a21c26', '#1a2f5a', '#ffffff'], 'Torino': ['#8a1e2d', '#ffffff', '#111111'],
  'Udinese': ['#111111', '#ffffff', '#c8c8c8'], 'Genoa': ['#a21c26', '#1a2f5a', '#ffffff'],
  'Como': ['#0057b8', '#ffffff', '#111111'], 'Cagliari': ['#a21c26', '#1a2f5a', '#ffffff'],
  'Lecce': ['#f2b705', '#c8102e', '#ffffff'], 'Parma': ['#f2b705', '#0057b8', '#ffffff'],
  'Sassuolo': ['#0b6e3f', '#111111', '#ffffff'], 'Verona': ['#f2b705', '#0057b8', '#ffffff'],
  'Pisa': ['#111111', '#0057b8', '#ffffff'], 'Cremonese': ['#c8102e', '#111111', '#ffffff'],
  'Bayern de Munique': ['#dc052d', '#ffffff', '#0066b2'], 'Borussia Dortmund': ['#fde100', '#111111', '#ffffff'],
  'Bayer Leverkusen': ['#e32221', '#111111', '#ffffff'], 'RB Leipzig': ['#dd0741', '#ffffff', '#001f47'],
  'Eintracht Frankfurt': ['#e1000f', '#111111', '#ffffff'], 'Stuttgart': ['#e32219', '#ffffff', '#111111'],
  'Wolfsburg': ['#65b32e', '#ffffff', '#111111'], 'Freiburg': ['#e2001a', '#111111', '#ffffff'],
  'Werder Bremen': ['#1d9053', '#ffffff', '#111111'], 'Mainz': ['#c3141e', '#ffffff', '#111111'],
  'Augsburg': ['#ba3733', '#ffffff', '#111111'], 'Mönchengladbach': ['#ffffff', '#111111', '#c8c8c8'],
  'Hoffenheim': ['#1c63b7', '#ffffff', '#111111'], 'Union Berlin': ['#eb1923', '#ffffff', '#111111'],
  'St. Pauli': ['#62483e', '#ffffff', '#111111'], 'Heidenheim': ['#e30613', '#0057b8', '#ffffff'],
  'Colônia': ['#ffffff', '#ed1c24', '#111111'], 'Hamburgo': ['#ffffff', '#0057b8', '#111111'],
  'PSG': ['#004170', '#da291c', '#ffffff'], 'Marselha': ['#ffffff', '#2faee0', '#111111'],
  'Mônaco': ['#e63946', '#ffffff', '#111111'], 'Lyon': ['#ffffff', '#1f4fa8', '#da291c'],
  'Lille': ['#e01e13', '#ffffff', '#111111'], 'Nice': ['#111111', '#e30613', '#ffffff'],
  'Lens': ['#f2b705', '#c8102e', '#ffffff'], 'Rennes': ['#e01e13', '#111111', '#ffffff'],
  'Strasbourg': ['#0067b1', '#ffffff', '#111111'], 'Nantes': ['#f2b705', '#0b6e3f', '#ffffff'],
  'Brest': ['#c8102e', '#ffffff', '#111111'], 'Toulouse': ['#7a2c8a', '#ffffff', '#111111'],
  'Auxerre': ['#ffffff', '#0057b8', '#111111'], 'Angers': ['#111111', '#ffffff', '#c8c8c8'],
  'Le Havre': ['#75c8e6', '#111111', '#ffffff'], 'Lorient': ['#f2b705', '#111111', '#ffffff'],
  'Metz': ['#7a1f3d', '#ffffff', '#111111'], 'Paris FC': ['#0057b8', '#111111', '#ffffff'],
  'Benfica': ['#da291c', '#ffffff', '#111111'], 'Porto': ['#004f9f', '#ffffff', '#111111'],
  'Sporting': ['#0b6e3f', '#ffffff', '#111111'], 'Braga': ['#c8102e', '#ffffff', '#111111'],
  'Vitória de Guimarães': ['#ffffff', '#111111', '#c8c8c8'], 'Santa Clara': ['#c8102e', '#ffffff', '#111111'],
  'Famalicão': ['#0057b8', '#ffffff', '#111111'], 'Moreirense': ['#0b6e3f', '#ffffff', '#111111'],
  'Estoril': ['#f2b705', '#0057b8', '#ffffff'], 'Rio Ave': ['#0b6e3f', '#ffffff', '#111111'],
  'Arouca': ['#f2b705', '#111111', '#ffffff'], 'Gil Vicente': ['#c8102e', '#ffffff', '#111111'],
  'Casa Pia': ['#111111', '#ffffff', '#c8c8c8'], 'Nacional': ['#111111', '#ffffff', '#c8102e'],
  'Estrela Amadora': ['#c8102e', '#ffffff', '#111111'], 'Alverca': ['#f2b705', '#c8102e', '#ffffff'],
  'Tondela': ['#f2b705', '#0b6e3f', '#ffffff'], 'AVS': ['#c8102e', '#111111', '#ffffff'],
  'Ajax': ['#ffffff', '#d2122e', '#111111'], 'PSV': ['#ed1c24', '#ffffff', '#111111'],
  'Feyenoord': ['#ffffff', '#d2122e', '#111111'], 'AZ Alkmaar': ['#d2122e', '#ffffff', '#111111'],
  'Twente': ['#d2122e', '#ffffff', '#111111'], 'Utrecht': ['#ffffff', '#d2122e', '#111111'],
  'Sparta Rotterdam': ['#d2122e', '#ffffff', '#111111'], 'Go Ahead Eagles': ['#d2122e', '#f2b705', '#ffffff'],
  'NEC': ['#d2122e', '#0b6e3f', '#ffffff'], 'Heerenveen': ['#0057b8', '#ffffff', '#d2122e'],
  'Fortuna Sittard': ['#f2b705', '#0b6e3f', '#ffffff'], 'Groningen': ['#0b6e3f', '#ffffff', '#111111'],
  'Zwolle': ['#0057b8', '#ffffff', '#111111'], 'Heracles': ['#111111', '#ffffff', '#d2122e'],
  'Excelsior': ['#d2122e', '#111111', '#ffffff'], 'Telstar': ['#ffffff', '#0057b8', '#111111'],
  'Volendam': ['#d2122e', '#ffffff', '#111111'], 'NAC Breda': ['#f2b705', '#111111', '#ffffff'],
  'América': ['#f2b705', '#0057b8', '#ffffff'], 'Monterrey': ['#0057b8', '#ffffff', '#111111'],
  'Tigres': ['#f2b705', '#0057b8', '#ffffff'], 'Cruz Azul': ['#0057b8', '#ffffff', '#c8102e'],
  'Guadalajara': ['#c8102e', '#ffffff', '#111111'], 'Pumas': ['#0057b8', '#f2b705', '#ffffff'],
  'Toluca': ['#c8102e', '#ffffff', '#111111'], 'León': ['#0b6e3f', '#ffffff', '#111111'],
  'Pachuca': ['#0057b8', '#ffffff', '#111111'], 'Atlas': ['#c8102e', '#111111', '#ffffff'],
  'Santos Laguna': ['#0b6e3f', '#ffffff', '#111111'], 'Necaxa': ['#c8102e', '#ffffff', '#111111'],
  'Puebla': ['#0057b8', '#ffffff', '#111111'], 'Querétaro': ['#111111', '#ffffff', '#c8102e'],
  'Mazatlán': ['#7a2c8a', '#ffffff', '#111111'], 'Juárez': ['#0b6e3f', '#ffffff', '#111111'],
  'Tijuana': ['#c8102e', '#111111', '#ffffff'], 'San Luis': ['#c8102e', '#ffffff', '#111111'],
  'River Plate': ['#ffffff', '#c8102e', '#111111'], 'Boca Juniors': ['#0b3d91', '#f2b705', '#ffffff'],
  'Racing': ['#75c8e6', '#ffffff', '#111111'], 'Independiente': ['#c8102e', '#ffffff', '#111111'],
  'San Lorenzo': ['#0b3d91', '#c8102e', '#ffffff'], 'Vélez': ['#ffffff', '#0057b8', '#111111'],
  'Estudiantes': ['#c8102e', '#ffffff', '#111111'], 'Gimnasia': ['#ffffff', '#0057b8', '#111111'],
  'Huracán': ['#c8102e', '#ffffff', '#111111'], 'Lanús': ['#7a1f3d', '#ffffff', '#111111'],
  'Argentinos Juniors': ['#c8102e', '#ffffff', '#111111'], 'Defensa y Justicia': ['#0b6e3f', '#f2b705', '#ffffff'],
  'Talleres': ['#0057b8', '#ffffff', '#111111'], 'Belgrano': ['#75c8e6', '#ffffff', '#111111'],
  'Rosario Central': ['#0057b8', '#f2b705', '#ffffff'], 'Newell\'s': ['#c8102e', '#111111', '#ffffff'],
  'Colón': ['#c8102e', '#111111', '#ffffff'], 'Unión': ['#c8102e', '#ffffff', '#111111'],
  'Banfield': ['#0b6e3f', '#ffffff', '#111111'], 'Tigre': ['#c8102e', '#0057b8', '#ffffff'],
  'Inter Miami': ['#f7b5cd', '#111111', '#ffffff'], 'LA Galaxy': ['#00245d', '#ffd200', '#ffffff'],
  'Los Angeles FC': ['#111111', '#c39e6d', '#ffffff'], 'Seattle Sounders': ['#5d9741', '#005595', '#ffffff'],
  'Atlanta United': ['#80000a', '#111111', '#ffffff'], 'New York City': ['#6cabdd', '#ffffff', '#111111'],
  'New York Red Bulls': ['#ffffff', '#c8102e', '#0057b8'], 'Columbus Crew': ['#f2b705', '#111111', '#ffffff'],
  'Philadelphia Union': ['#111111', '#0b3d91', '#f2b705'], 'Orlando City': ['#633492', '#ffffff', '#f2b705'],
  'Toronto FC': ['#c8102e', '#ffffff', '#111111'], 'CF Montréal': ['#0057b8', '#111111', '#ffffff'],
  'Austin FC': ['#0b6e3f', '#111111', '#ffffff'], 'FC Dallas': ['#c8102e', '#0057b8', '#ffffff'],
  'Portland Timbers': ['#0b6e3f', '#f2b705', '#ffffff'], 'Vancouver Whitecaps': ['#ffffff', '#0057b8', '#111111'],
  'Al-Hilal': ['#0057b8', '#ffffff', '#111111'], 'Al-Nassr': ['#f2b705', '#0057b8', '#ffffff'],
  'Al-Ittihad': ['#f2b705', '#111111', '#ffffff'], 'Al-Ahli': ['#0b6e3f', '#ffffff', '#111111'],
  'Al-Shabab': ['#ffffff', '#111111', '#c8c8c8'], 'Al-Ettifaq': ['#c8102e', '#ffffff', '#111111'],
  'Al-Taawoun': ['#f2b705', '#0057b8', '#ffffff'], 'Al-Fateh': ['#0b6e3f', '#ffffff', '#111111'],
  'Al-Fayha': ['#c8102e', '#111111', '#ffffff'], 'Damac': ['#0057b8', '#ffffff', '#111111'],
  'Al-Riyadh': ['#ffffff', '#c8102e', '#111111'], 'Al-Khaleej': ['#f2b705', '#111111', '#ffffff'],
  'Al-Okhdood': ['#0b6e3f', '#ffffff', '#111111'], 'Al-Najma': ['#0057b8', '#f2b705', '#ffffff'],
  'Al-Qadsiah': ['#f2b705', '#0057b8', '#ffffff'], 'Al-Kholood': ['#c8102e', '#ffffff', '#111111'],
  'Al-Raed': ['#111111', '#ffffff', '#c8102e'], 'Al-Wehda': ['#c8102e', '#ffffff', '#111111']
};

const FIRST_BR = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'João', 'Rafael', 'Bruno', 'Thiago', 'Felipe', 'Gustavo', 'Vinícius', 'Caio', 'Luan', 'Diego', 'Eduardo', 'Henrique', 'Igor', 'Kaique', 'Leandro', 'Marcelo', 'Nicolas', 'Otávio', 'Paulo', 'Renato', 'Rodrigo', 'Samuel', 'Tales', 'Vitor', 'Wesley', 'Yuri', 'André', 'Breno', 'Cauã', 'Danilo', 'Erick', 'Fábio', 'Guilherme', 'Hugo', 'Ítalo', 'Júlio', 'Kevin', 'Léo', 'Murilo', 'Nathan', 'Oscar', 'Pietro', 'Raul', 'Sávio', 'Tomás', 'Ubirajara', 'Arthur', 'Bernardo', 'César', 'Davi', 'Enzo', 'Fernando', 'Gilberto', 'Heitor', 'Ian', 'Joaquim', 'Lorenzo', 'Miguel', 'Noah', 'Ravi', 'Theo', 'Zeca', 'Alan', 'Alex', 'Antônio', 'Benício', 'Carlos', 'Daniel', 'Emerson', 'Francisco', 'Gerson', 'Hélio', 'Israel', 'Jorge', 'Kleber', 'Luciano', 'Márcio', 'Neto', 'Osvaldo', 'Ricardo', 'Sérgio', 'Túlio', 'Wagner', 'Adriano', 'Beto', 'Cléber', 'Djalma', 'Éder', 'Gilmar', 'Juninho', 'Maicon', 'Ronaldo', 'Romário', 'Zico'];
const LAST_BR = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida', 'Nascimento', 'Araújo', 'Ribeiro', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Alves', 'Monteiro', 'Mendes', 'Cardoso', 'Teixeira', 'Moreira', 'Correia', 'Dias', 'Castro', 'Campos', 'Cavalcanti', 'Freitas', 'Fonseca', 'Machado', 'Marques', 'Moraes', 'Nogueira', 'Pinto', 'Reis', 'Sampaio', 'Tavares', 'Vieira', 'Xavier', 'Azevedo', 'Bastos', 'Batista', 'Borges', 'Braga', 'Caldeira', 'Cunha', 'Duarte', 'Esteves', 'Faria', 'Fernandes', 'Figueiredo', 'Furtado', 'Guimarães', 'Leal', 'Lopes', 'Macedo', 'Magalhães', 'Maia', 'Melo', 'Menezes', 'Miranda', 'Neves', 'Paiva', 'Peixoto', 'Pinheiro', 'Pires', 'Queiroz', 'Ramos', 'Resende', 'Sales', 'Siqueira', 'Soares', 'Teles', 'Valente', 'Vasconcelos', 'Viana', 'Vilela', 'Amorim', 'Andrade', 'Assis', 'Brito', 'Coelho', 'Cruz', 'Fagundes', 'Garcia', 'Lacerda', 'Lemos', 'Luz', 'Medeiros', 'Meireles', 'Moura', 'Nunes', 'Pacheco', 'Padilha', 'Prado', 'Procópio', 'Rego', 'Sá', 'Salles', 'Siqueira'];
const FIRST_INT = ['James', 'Oliver', 'Harry', 'Jack', 'Liam', 'Noah', 'Ethan', 'Mason', 'Lucas', 'Mateo', 'Hugo', 'Léo', 'Marco', 'Luca', 'Alessandro', 'Diego', 'Sergio', 'Pablo', 'Álvaro', 'Iker', 'Unai', 'Mikel', 'Ander', 'Nico', 'Jules', 'Hugo', 'Théo', 'Mathis', 'Enzo', 'Louis', 'Thomas', 'Max', 'Leon', 'Jonas', 'Felix', 'Tim', 'Jan', 'Lars', 'Finn', 'Milan', 'Daan', 'Sem', 'Ruben', 'Tobias', 'Elias', 'Oskar', 'Emil', 'Viktor', 'Anton', 'Erik', 'Joel', 'Isak', 'Karim', 'Yassine', 'Achraf', 'Ilias', 'Rayan', 'Amine', 'Youssef', 'Mehdi', 'Sami', 'Kai', 'Kenji', 'Haruto', 'Ren', 'Min-jun', 'Ji-ho', 'Carlos', 'Juan', 'Andrés', 'Felipe', 'Santiago', 'Emiliano', 'Lautaro', 'Facundo', 'Joaquín', 'Bruno', 'Thiago', 'Matías', 'Agustín', 'Nahuel', 'Franco', 'Gonzalo', 'Rodrigo', 'Tomás', 'Valentín'];
const LAST_INT = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Romero', 'Silva', 'Santos', 'Ferreira', 'Costa', 'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Moretti', 'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz', 'Dubois', 'Martin', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Moreau', 'Laurent', 'Lefebvre', 'Roux', 'Fournier', 'Girard', 'André', 'Mercier', 'Blanc', 'Guerin', 'Boyer', 'De Jong', 'Van Dijk', 'Van der Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'Groot', 'Jansen', 'Andersen', 'Johansen', 'Larsen', 'Nilsen', 'Hansen', 'Pedersen', 'Karlsen', 'Berg', 'Haugen', 'Yamamoto', 'Tanaka', 'Sato', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi', 'Kato', 'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Al-Hassan', 'Al-Farouk', 'Benali', 'El Amrani', 'Ouattara', 'Diallo', 'Traoré', 'Keita', 'Mensah', 'Owusu', 'Adeyemi', 'Okafor', 'Eze', 'Nwosu', 'Obi', 'Ibrahim', 'Hernández', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Vargas', 'Rojas', 'Mendoza', 'Castillo', 'Ortega', 'Navarro', 'Iglesias', 'Domínguez', 'Varela', 'Pereyra', 'Gómez', 'Sosa', 'Benitez', 'Acosta', 'Medina', 'Godoy', 'Quintero', 'Vergara', 'Muñoz', 'Sepúlveda', 'Cárdenas', 'Fuentes', 'Alarcón'];

const REGION_NATS = {
  brazil: ['Brasil', 'Argentina', 'Uruguai', 'Colômbia', 'Chile', 'Paraguai', 'Peru', 'Equador', 'Venezuela', 'Bolívia'],
  europe: ['Espanha', 'França', 'Inglaterra', 'Alemanha', 'Itália', 'Portugal', 'Holanda', 'Bélgica', 'Croácia', 'Sérvia', 'Suíça', 'Áustria', 'Dinamarca', 'Noruega', 'Suécia', 'Polônia', 'Turquia', 'Grécia', 'Escócia', 'Irlanda', 'Ucrânia', 'Tchéquia'],
  america: ['México', 'EUA', 'Canadá', 'Costa Rica', 'Honduras', 'Panamá', 'Jamaica', 'Argentina', 'Brasil', 'Colômbia'],
  asia: ['Japão', 'Coreia do Sul', 'Arábia Saudita', 'Catar', 'Emirados Árabes', 'Irã', 'Austrália', 'Iraque', 'Uzbequistão', 'China']
};
const NAT_BY_NAME = new Map(NATION_DEFS.map(d => [d[0], d]));

export function getFormation(name) { return FORMATIONS[name] || FORMATIONS['4-4-2']; }

export function teamOverall(team) {
  if (!team) return 70;
  const lineup = (team.lineup || []).map(id => team.players?.find(p => p.id === id)).filter(Boolean);
  const arr = lineup.length ? lineup : (team.players || []).slice(0, 11);
  if (!arr.length) return 70;
  const total = arr.reduce((s, p) => s + (p.overall || 70), 0);
  return Math.round(total / arr.length);
}

export function bestEleven(team, formationName) {
  const f = getFormation(formationName || team.formation);
  const pool = (team.players || []).filter(p => !p.retired);
  const used = new Set();
  const result = [];
  const fit = (p, pos) => {
    if (!p) return -99;
    const g = POS_GROUP[p.pos], tg = POS_GROUP[pos];
    let bonus = 0;
    if (p.pos === pos) bonus = 12;
    else if (g === tg) bonus = 6;
    else if ((g === 'DEF' && tg === 'MEI') || (g === 'MEI' && tg === 'DEF')) bonus = 1;
    else if ((g === 'MEI' && tg === 'ATA') || (g === 'ATA' && tg === 'MEI')) bonus = 1;
    else bonus = -8;
    return p.overall + bonus;
  };
  for (const slot of f.slots) {
    let best = null, bestScore = -1e9;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      if (slot.pos === 'GOL' && p.pos !== 'GOL') continue;
      if (slot.pos !== 'GOL' && p.pos === 'GOL') continue;
      const s = fit(p, slot.pos) + (p.form || 0);
      if (s > bestScore) { bestScore = s; best = p; }
    }
    if (best) { used.add(best.id); result.push(best.id); }
  }
  for (const p of pool) {
    if (result.length >= 11) break;
    if (!used.has(p.id) && p.pos !== 'GOL') { used.add(p.id); result.push(p.id); }
  }
  if (result.length < 11) {
    for (const p of pool) if (!used.has(p.id)) { used.add(p.id); result.push(p.id); if (result.length >= 11) break; }
  }
  return result;
}

export function autoLineup(team) {
  team.lineup = bestEleven(team, team.formation);
  const set = new Set(team.lineup);
  team.bench = (team.players || []).filter(p => !set.has(p.id) && p.pos !== 'GOL').map(p => p.id);
  const gk = (team.players || []).find(p => p.pos === 'GOL' && !set.has(p.id));
  if (gk) team.bench.unshift(gk.id);
  if (team.bench.length < 7) {
    const extra = (team.players || []).filter(p => !set.has(p.id) && !team.bench.includes(p.id)).map(p => p.id);
    team.bench.push(...extra);
  }
  team.lineup = team.lineup.slice(0, 11);
  team.bench = team.bench.slice(0, 9);
  return team;
}

function playerName(rng, region, foreign) {
  if (region === 'brazil' && !foreign) return `${rng.pick(FIRST_BR)} ${rng.pick(LAST_BR)}`;
  if (region === 'brazil') return `${rng.pick(FIRST_INT)} ${rng.pick(LAST_INT)}`;
  return `${rng.pick(FIRST_INT)} ${rng.pick(LAST_INT)}`;
}

const APPEARANCE_SKIN = ['#f1c9a5', '#e0ac7e', '#c6885c', '#a2653c', '#784228', '#4e2a16'];
const HAIR_COLORS = ['#17110d', '#2b1a10', '#4a2a16', '#7a4a21', '#b5813e', '#d9b06d', '#1b1b1b', '#5d5d5d'];
const HAIR_STYLES = ['curto', 'fade', 'cacheado', 'longo', 'moicano', 'careca', 'coque', 'afro'];

function makePlayer(team, rng, index, pos, skill, region, isBench) {
  const gid = POS_GROUP[pos] || 'MEI';
  const base = clamp(skill + rng.gauss(0, 3.4), 42, 94);
  const paceBoost = pos === 'PON' || pos === 'LAT' ? 6 : pos === 'ATA' ? 3 : pos === 'VOL' ? -2 : 0;
  const attr = {
    pace: Math.round(clamp(base + paceBoost + rng.gauss(0, 5), 35, 96)),
    shoot: Math.round(clamp(base + (pos === 'ATA' ? 8 : pos === 'PON' ? 3 : pos === 'MEI' ? 2 : pos === 'GOL' ? -28 : -6) + rng.gauss(0, 5), 30, 96)),
    pass: Math.round(clamp(base + (pos === 'MEI' || pos === 'VOL' ? 7 : pos === 'GOL' ? -18 : 0) + rng.gauss(0, 5), 32, 96)),
    dribble: Math.round(clamp(base + (pos === 'PON' || pos === 'MEI' ? 6 : pos === 'GOL' ? -24 : 0) + rng.gauss(0, 5), 30, 96)),
    defense: Math.round(clamp(base + (pos === 'ZAG' || pos === 'VOL' ? 10 : pos === 'LAT' ? 4 : pos === 'GOL' ? 6 : pos === 'ATA' ? -16 : -5) + rng.gauss(0, 5), 28, 96)),
    physical: Math.round(clamp(base + (pos === 'ZAG' || pos === 'VOL' ? 7 : pos === 'GOL' ? 4 : pos === 'PON' ? -5 : 0) + rng.gauss(0, 5), 30, 96)),
    gk: pos === 'GOL' ? Math.round(clamp(base + 8 + rng.gauss(0, 4), 45, 96)) : Math.round(clamp(base * 0.32 + rng.range(0, 12), 10, 45))
  };
  const weights = gid === 'ATA' ? { pace: .2, shoot: .35, pass: .1, dribble: .2, defense: .02, physical: .08, gk: 0 }
    : gid === 'MEI' ? { pace: .13, shoot: .14, pass: .3, dribble: .2, defense: .13, physical: .08, gk: 0 }
      : gid === 'DEF' ? { pace: .15, shoot: .04, pass: .12, dribble: .06, defense: .35, physical: .26, gk: 0 }
        : { pace: .06, shoot: .03, pass: .08, dribble: .03, defense: .05, physical: .15, gk: .6 };
  let overall = 0;
  for (const k in weights) overall += attr[k] * weights[k];
  if (gid === 'GOL') overall = attr.gk * .82 + attr.physical * .08 + attr.pass * .05 + attr.defense * .05;
  overall = Math.round(clamp(overall, 40, 96));
  const age = rng.int(18, 36);
  const regionNats = REGION_NATS[region] || REGION_NATS.europe;
  let nat = team.country || rng.pick(regionNats);
  if (!team.isNational) {
    if (rng.chance(team.leagueRegion === 'brazil' ? 0.82 : 0.38)) nat = team.country || nat;
    else nat = rng.pick(regionNats);
  } else nat = team.country;
  const nationDef = NAT_BY_NAME.get(nat);
  const value = Math.round((Math.pow(Math.max(1, overall - 45), 2.7) * 240 + 90000) * (age <= 23 ? 1.35 : age >= 31 ? .55 : 1) * (region === 'europe' ? 1.15 : 1));
  const shirt = index < 11 ? (isBench ? rng.int(12, 45) : index + 1) : rng.int(12, 45);
  const p = {
    id: `p_${team.id}_${index}`,
    name: playerName(rng, region, team.isNational ? false : rng.chance(.25)),
    teamId: team.id,
    pos, posGroup: gid, num: pos === 'GOL' ? (index === 0 ? 1 : rng.int(12, 23)) : shirt,
    age, nat, flag: nationDef ? nationDef[2] : (team.flag || '🌍'),
    attrs: attr, overall, potential: clamp(overall + rng.int(0, 9) - (age > 29 ? rng.int(2, 8) : 0), overall, 96),
    value, wage: Math.round(value / 180 + 2000), form: 0, fitness: 100, morale: 78, growth: 0,
    foot: rng.chance(.72) ? 'Direito' : 'Esquerdo', height: rng.int(168, 196), weight: rng.int(62, 92),
    skin: rng.pick(APPEARANCE_SKIN), hair: rng.pick(HAIR_COLORS), hairStyle: rng.pick(HAIR_STYLES),
    squadRole: isBench ? 'reserva' : 'titular', stats: { apps: 0, goals: 0, assists: 0, yellow: 0, red: 0, rating: 0 }
  };
  return p;
}

function assignStadium(rng, teamName, leagueRegion) {
  const map = {
    'Flamengo': 'maracana', 'Fluminense': 'maracana', 'Corinthians': 'arena-corinthians', 'Palmeiras': 'allianz-parque',
    'São Paulo': 'morumbi', 'Cruzeiro': 'mineirao', 'Atlético Mineiro': 'mineirao', 'Real Madrid': 'santiago-bernabeu',
    'Barcelona': 'camp-nou', 'Milan': 'san-siro', 'Inter de Milão': 'san-siro', 'Manchester United': 'old-trafford',
    'Liverpool': 'anfield', 'Borussia Dortmund': 'signal-iduna', 'Boca Juniors': 'la-bombonera', 'América': 'azteca'
  };
  const id = map[teamName];
  if (id) return id;
  const pool = leagueRegion === 'brazil' ? ['estadio-nacional', 'morumbi', 'mineirao', 'arena-corinthians', 'allianz-parque', 'maracana']
    : leagueRegion === 'europe' ? ['estadio-nacional', 'san-siro', 'old-trafford', 'anfield', 'wembley', 'camp-nou', 'santiago-bernabeu', 'signal-iduna']
      : leagueRegion === 'asia' ? ['estadio-nacional', 'moulay-abdellah', 'azteca'] : ['estadio-nacional', 'azteca', 'la-bombonera', 'maracana'];
  return rng.pick(pool);
}

function makeTeam(def, opts) {
  const { leagueId, leagueName, leagueRegion, base, index, seed, isNational, rating, colors } = opts;
  const id = isNational ? `nat-${slug(def)}` : slug(def);
  const rng = new RNG(`${seed}:${id}`);
  const strength = clamp(base + (opts.teamCount ? (opts.teamCount / 2 - index) * 0.75 : 0) + rng.range(-2.5, 2.5), 55, 92);
  const col = colors || TEAM_COLORS[def] || [rng.pick(['#1f79ff', '#c8102e', '#0b6e3f', '#f2b705', '#111111', '#7a2c8a', '#0057b8', '#ff6a13']), rng.pick(['#ffffff', '#111111', '#d4af37', '#c8c8c8']), rng.pick(['#ffffff', '#111111', '#35d6ff'])];
  const country = isNational ? def : (LEAGUES.find(l => l.id === leagueId)?.country || 'Brasil');
  const formation = rng.pick(Object.keys(FORMATIONS));
  const stadiumId = assignStadium(rng, def, leagueRegion);
  const team = {
    id, name: def, short: isNational ? opts.short : def.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase(),
    city: isNational ? def : '', country, flag: opts.flag || '🌍', leagueId, leagueName,
    leagueRegion, isNational: !!isNational,
    colors: { primary: col[0], secondary: col[1], accent: col[2], shorts: col[1] === '#ffffff' ? col[0] : col[1], socks: col[0], gk: rng.pick(['#1de9b6', '#ffd54f', '#ff7043', '#7c4dff', '#f06292', '#80cbc4']) },
    crest: { shape: rng.int(0, 5), symbol: rng.int(0, 7), initial: (opts.short || def.slice(0, 3)).slice(0, 3).toUpperCase() },
    kitPattern: rng.int(0, 5),
    stadiumId,
    stadium: STADIUMS.find(s => s.id === stadiumId) || STADIUMS[0],
    formation, tactics: { mentality: rng.int(1, 3), pressing: rng.int(1, 3), width: rng.int(1, 3), tempo: rng.int(1, 3) },
    reputation: Math.round(strength), budget: Math.round((Math.pow(strength, 2.25) * 1200 + 6000000) / 100000) * 100000,
    players: [], lineup: [], bench: [], classic: false, nationRating: rating || null, trophies: []
  };
  const positions = getFormation(formation).slots.map(s => s.pos);
  const benchPositions = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'PON', 'ATA', 'MEI', 'ATA'];
  let idx = 0;
  for (const pos of positions) {
    const skill = isNational ? (rating || strength) - (pos === 'GOL' ? 1 : 0) + rng.gauss(0, 2.4) : strength + rng.gauss(0, 4);
    team.players.push(makePlayer(team, rng, idx++, pos, skill, leagueRegion || 'europe', false));
  }
  for (const pos of benchPositions) {
    const skill = isNational ? (rating || strength) - 4 + rng.gauss(0, 2) : strength - 4 + rng.gauss(0, 4);
    team.players.push(makePlayer(team, rng, idx++, pos, skill, leagueRegion || 'europe', true));
  }
  team.players.forEach((p, i) => { if (i < 11) p.num = p.pos === 'GOL' ? 1 : i + 1; });
  autoLineup(team);
  return team;
}

export function createWorld(seed = 'pes2027-stickman') {
  const rng = new RNG(seed);
  const world = { seed, version: SAVE_VERSION, leagues: [], teams: {}, competitions: [], createdAt: Date.now() };
  for (const lg of LEAGUES) {
    const teamIds = [];
    lg.teams.forEach((name, index) => {
      const t = makeTeam(name, { leagueId: lg.id, leagueName: lg.name, leagueRegion: lg.region, base: lg.base, index, teamCount: lg.teams.length, seed, flag: lg.flag });
      t.leagueRegion = lg.region;
      world.teams[t.id] = t;
      teamIds.push(t.id);
    });
    world.leagues.push({ id: lg.id, name: lg.name, country: lg.country, flag: lg.flag, region: lg.region, base: lg.base, teamIds, kind: 'league' });
  }
  const nationIds = [];
  for (const n of NATION_DEFS) {
    const t = makeTeam(n[0], { leagueId: 'nations', leagueName: 'Seleções', leagueRegion: 'europe', base: n[3], index: 0, teamCount: 1, seed, isNational: true, rating: n[3], short: n[1], flag: n[2], colors: [n[4], n[5], n[6]] });
    t.isNational = true; t.country = n[0]; t.flag = n[2]; t.short = n[1]; t.stadium = STADIUMS[0]; t.stadiumId = 'estadio-nacional';
    t.name = n[0];
    world.teams[t.id] = t; nationIds.push(t.id);
  }
  world.leagues.push({ id: 'nations', name: 'Seleções Nacionais', country: 'Mundo', flag: '🌍', region: 'world', base: 80, teamIds: nationIds, kind: 'nations' });
  const classicIds = [];
  for (const c of CLASSIC_DEFS) {
    const t = makeTeam(c.name, { leagueId: 'classics', leagueName: 'Lendas', leagueRegion: 'europe', base: c.rating, index: 0, teamCount: 1, seed, isNational: true, rating: c.rating, short: c.short, flag: c.flag, colors: c.colors });
    t.isNational = false; t.classic = true; t.classicId = c.id; t.leagueId = 'classics'; t.leagueName = 'Lendas'; t.country = c.name; t.stadium = STADIUMS[0];
    t.id = c.id; t.players.forEach(p => { p.teamId = t.id; });
    world.teams[t.id] = t; classicIds.push(t.id);
  }
  world.leagues.push({ id: 'classics', name: 'Times Lendários', country: 'Mundo', flag: '🏆', region: 'world', base: 94, teamIds: classicIds, kind: 'classics' });
  world.competitions = buildCompetitions(world);
  world.classicIds = classicIds;
  return world;
}

function buildCompetitions(world) {
  const comps = [];
  for (const lg of world.leagues) {
    if (lg.kind === 'league') {
      comps.push({ id: `league-${lg.id}`, name: lg.name, kind: 'league', leagueId: lg.id, country: lg.country, flag: lg.flag, icon: '🏆', desc: 'Temporada completa em pontos corridos.', teamIds: lg.teamIds.slice() });
    }
  }
  const bra = world.leagues.find(l => l.id === 'brasileirao')?.teamIds || [];
  const braB = world.leagues.find(l => l.id === 'brasileirao-b')?.teamIds || [];
  const europe = ['premier', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'primeira', 'eredivisie'].flatMap(id => world.leagues.find(l => l.id === id)?.teamIds || []);
  const south = [...bra, ...(world.leagues.find(l => l.id === 'argentina')?.teamIds || [])];
  const nations = world.leagues.find(l => l.id === 'nations')?.teamIds || [];
  comps.push({ id: 'copa-do-brasil', name: 'Copa do Brasil', kind: 'cup', country: 'Brasil', flag: '🇧🇷', icon: '🥇', desc: 'Mata-mata nacional com 32 clubes.', teamIds: [...bra.slice(0, 16), ...braB.slice(0, 16)] });
  comps.push({ id: 'libertadores', name: 'Libertadores', kind: 'cup', country: 'América do Sul', flag: '🌎', icon: '🏆', desc: 'A glória eterna da América.', teamIds: south.slice(0, 32) });
  comps.push({ id: 'champions', name: 'Champions League', kind: 'cup', country: 'Europa', flag: '🇪🇺', icon: '⭐', desc: 'A maior competição de clubes do mundo.', teamIds: europe.slice(0, 32) });
  comps.push({ id: 'copa-do-mundo', name: 'Copa do Mundo', kind: 'cup', country: 'Mundo', flag: '🌍', icon: '🌐', desc: 'Seleções em busca da glória eterna.', teamIds: nations.slice(0, 32) });
  comps.push({ id: 'copa-america', name: 'Copa América', kind: 'cup', country: 'América', flag: '🌎', icon: '🏅', desc: 'O duelo das seleções sul-americanas.', teamIds: nations.filter(id => ['nat-brasil', 'nat-argentina', 'nat-uruguai', 'nat-colombia', 'nat-chile', 'nat-peru', 'nat-equador', 'nat-paraguai', 'nat-mexico', 'nat-eua'].includes(id)) });
  comps.push({ id: 'eurocopa', name: 'Eurocopa', kind: 'cup', country: 'Europa', flag: '🇪🇺', icon: '🏅', desc: 'As melhores seleções da Europa.', teamIds: nations.filter(id => ['nat-franca', 'nat-espanha', 'nat-inglaterra', 'nat-alemanha', 'nat-portugal', 'nat-holanda', 'nat-italia', 'nat-belgica', 'nat-croacia', 'nat-uruguai'].includes(id)) });
  comps.push({ id: 'torneio-relampago', name: 'Torneio Relâmpago', kind: 'cup', country: 'Mundo', flag: '⚡', icon: '⚡', desc: '8 equipes, mata-mata rápido.', teamIds: [...bra.slice(0, 4), ...europe.slice(0, 4)] });
  return comps;
}

export function getLeague(world, id) { return world.leagues.find(l => l.id === id); }
export function getTeam(world, id) { return world.teams[id]; }
export function leagueTeams(world, leagueId) {
  const lg = getLeague(world, leagueId);
  return (lg?.teamIds || []).map(id => world.teams[id]).filter(Boolean);
}
export function allClubTeams(world) {
  return Object.values(world.teams).filter(t => !t.isNational && !t.classic);
}
export function nationalTeams(world) {
  return (world.leagues.find(l => l.id === 'nations')?.teamIds || []).map(id => world.teams[id]).filter(Boolean);
}
export function classicTeams(world) {
  return (world.classicIds || []).map(id => world.teams[id]).filter(Boolean);
}
export function competitionsFor(world) { return world.competitions || []; }

export function stadiumById(id) {
  return STADIUMS.find(s => s.id === id) || STADIUMS[0];
}

export function defaultProfile() {
  return {
    name: 'Jogador', level: 1, xp: 0, coins: 2500, wins: 0, draws: 0, losses: 0, goals: 0,
    matches: 0, trophies: [], unlocked: [], achievements: [], createdAt: Date.now(),
    settings: { ...DEFAULT_SETTINGS }, slot: 0, lastSave: null, favoriteTeam: null
  };
}

export function unlockItem(profile, item) {
  if (!profile.unlocked) profile.unlocked = [];
  if (!profile.unlocked.includes(item.id)) profile.unlocked.push(item.id);
}

export function isStadiumUnlocked(profile, id) {
  const st = stadiumById(id);
  if (st.free) return true;
  return (profile.unlocked || []).includes('stadium-' + id);
}
export function isKitUnlocked(profile, ref) { return (profile.unlocked || []).includes('kit-' + ref); }
export function isTeamUnlocked(profile, team) {
  if (!team?.classic) return true;
  return (profile.unlocked || []).includes('team-' + team.classicId) || (profile.unlocked || []).includes('team-' + team.id);
}
export function isCelebrationUnlocked(profile, ref) { return (profile.unlocked || []).includes('celebration-' + ref); }

export function crestSvg(team, opts = {}) {
  if (!team) return '';
  const size = opts.size || 46;
  const c = team.colors || { primary: '#1f79ff', secondary: '#ffffff', accent: '#35d6ff' };
  const shapes = [
    'M32 4 L58 10 L55 38 Q50 53 32 60 Q14 53 9 38 L6 10 Z',
    'M32 4 A28 28 0 1 1 31.9 4 Z',
    'M32 3 L60 18 L52 52 L32 61 L12 52 L4 18 Z',
    'M32 4 L60 32 L32 60 L4 32 Z',
    'M10 8 L54 8 L58 42 L32 61 L6 42 Z',
    'M8 14 L32 4 L56 14 L56 44 L32 60 L8 44 Z'
  ];
  const shape = shapes[(team.crest?.shape ?? 0) % shapes.length];
  const symbol = team.crest?.symbol ?? 0;
  const initial = escapeHtml(team.crest?.initial || team.short || 'PES');
  let inner = '';
  if (symbol === 0) inner = `<text x="32" y="39" font-family="Arial" font-size="17" font-weight="900" fill="${textColor(c.primary)}" text-anchor="middle">${initial}</text>`;
  else if (symbol === 1) inner = `<path d="M32 15 L38 29 L53 30 L42 40 L45 54 L32 46 L19 54 L22 40 L11 30 L26 29 Z" fill="${c.secondary}"/>`;
  else if (symbol === 2) inner = `<circle cx="32" cy="33" r="12" fill="none" stroke="${c.secondary}" stroke-width="3"/><path d="M20 33 H44" stroke="${c.secondary}" stroke-width="3"/>`;
  else if (symbol === 3) inner = `<path d="M18 48 L32 16 L46 48 Z" fill="${c.secondary}"/><path d="M25 48 L32 31 L39 48 Z" fill="${c.primary}"/>`;
  else if (symbol === 4) inner = `<circle cx="32" cy="19" r="7" fill="${c.secondary}"/><circle cx="19" cy="39" r="7" fill="${c.secondary}"/><circle cx="45" cy="39" r="7" fill="${c.secondary}"/>`;
  else if (symbol === 5) inner = `<rect x="16" y="19" width="32" height="5" fill="${c.secondary}"/><rect x="16" y="30" width="32" height="5" fill="${c.secondary}"/><rect x="16" y="41" width="32" height="5" fill="${c.secondary}"/>`;
  else if (symbol === 6) inner = `<path d="M32 14 L37 25 L49 27 L40 36 L42 48 L32 42 L22 48 L24 36 L15 27 L27 25 Z" fill="${c.secondary}"/><circle cx="32" cy="33" r="6" fill="${c.primary}"/>`;
  else inner = `<path d="M32 13 L41 24 L37 48 H27 L23 24 Z" fill="${c.secondary}"/><circle cx="32" cy="21" r="6" fill="${c.accent}"/>`;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><path d="${shape}" fill="${c.primary}" stroke="${c.secondary}" stroke-width="2.5"/><path d="${shape}" fill="none" stroke="${c.accent}" stroke-width="1" opacity=".65"/>${inner}</svg>`;
}

export function colorDistance(a, b) {
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const A = hex(a), B = hex(b);
  return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
}

export function generateFixtures(teamIds, rng = new RNG(7), doubleRound = true) {
  const teams = rng.shuffle(teamIds.slice());
  if (teams.length % 2) teams.push('__bye__');
  const n = teams.length;
  const rounds = [];
  const half = n / 2;
  let arr = teams.slice();
  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a !== '__bye__' && b !== '__bye__') matches.push({ home: r % 2 === 0 ? a : b, away: r % 2 === 0 ? b : a });
    }
    rounds.push(matches);
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  if (doubleRound) {
    const second = rounds.map(round => round.map(m => ({ home: m.away, away: m.home })));
    return [...rounds, ...second];
  }
  return rounds;
}

export function simulateScore(home, away, rng = new RNG(Math.random() * 1e9 | 0), neutral = false) {
  const hStrength = teamOverall(home) + (neutral ? 0 : 3) + (home.tactics?.mentality || 2) * .3;
  const aStrength = teamOverall(away);
  const diff = hStrength - aStrength;
  const hBase = 1.28 + diff * 0.035;
  const aBase = 1.12 - diff * 0.032;
  const hGoals = Math.max(0, Math.round(rng.gauss(hBase, 1.05)));
  const aGoals = Math.max(0, Math.round(rng.gauss(aBase, 1.0)));
  return { home: Math.min(7, hGoals), away: Math.min(7, aGoals) };
}

export function teamRatingStars(team) {
  const ovr = teamOverall(team);
  const stars = clamp(ovr / 20, 1, 5);
  return Math.round(stars * 2) / 2;
}
