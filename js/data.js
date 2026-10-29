/* PES 2027 STICKMAN 2D — camada de dados determinística.
   Todo o conteúdo é gerado localmente, sem dependências externas. */

export const VERSION = '1.0.0';
export const SEASON = 2027;

export const DIFFICULTIES = [
  { id: 'amador', name: 'Amador', desc: 'Ritmo tranquilo, IA generosa.', ai: .72, speed: .9 },
  { id: 'profissional', name: 'Profissional', desc: 'Equilíbrio de arcade e simulação.', ai: .9, speed: 1 },
  { id: 'estrela', name: 'Estrela', desc: 'Marcação forte e passes cirúrgicos.', ai: 1.06, speed: 1.06 },
  { id: 'lenda', name: 'Lenda', desc: 'A experiência definitiva. Sem piedade.', ai: 1.22, speed: 1.12 }
];

export const CAMERAS = [
  { id: 'transmissao', name: 'Transmissão', desc: 'Câmera de TV com follow suave.' },
  { id: 'dinamica', name: 'Dinâmica', desc: 'Zoom aproximado na jogada.' },
  { id: 'aerea', name: 'Aérea', desc: 'Visão ampla do gramado.' },
  { id: 'classica', name: 'TV Clássica', desc: 'Mais distante, estilo retrô.' }
];

export const WEATHERS = [
  { id: 'limpo', name: 'Limpo', icon: '☀', friction: 1, wind: 0 },
  { id: 'nublado', name: 'Nublado', icon: '☁', friction: 1, wind: .2 },
  { id: 'chuva', name: 'Chuva', icon: '☂', friction: .86, wind: .5 },
  { id: 'noite', name: 'Noite', icon: '☾', friction: 1, wind: .1 },
  { id: 'neve', name: 'Neve', icon: '❄', friction: .72, wind: .8 }
];

export const FORMATIONS = {
  '4-3-3': { name: '4-3-3 Ofensivo', slots: [
    ['GOL', .05, .50], ['LAT', .20, .17], ['ZAG', .17, .37], ['ZAG', .17, .63], ['LAT', .20, .83],
    ['VOL', .41, .50], ['MEI', .52, .30], ['MEI', .52, .70],
    ['PON', .71, .18], ['ATA', .78, .50], ['PON', .71, .82]
  ]},
  '4-4-2': { name: '4-4-2 Clássico', slots: [
    ['GOL', .05, .50], ['LAT', .20, .17], ['ZAG', .16, .37], ['ZAG', .16, .63], ['LAT', .20, .83],
    ['PON', .40, .16], ['VOL', .38, .40], ['MEI', .46, .60], ['PON', .40, .84],
    ['ATA', .72, .40], ['ATA', .72, .60]
  ]},
  '4-2-3-1': { name: '4-2-3-1 Controle', slots: [
    ['GOL', .05, .50], ['LAT', .19, .16], ['ZAG', .16, .37], ['ZAG', .16, .63], ['LAT', .19, .84],
    ['VOL', .34, .38], ['VOL', .34, .62],
    ['PON', .55, .16], ['MEI', .58, .50], ['PON', .55, .84], ['ATA', .76, .50]
  ]},
  '3-5-2': { name: '3-5-2 Pressão', slots: [
    ['GOL', .05, .50], ['ZAG', .16, .30], ['ZAG', .14, .50], ['ZAG', .16, .70],
    ['LAT', .42, .12], ['VOL', .36, .50], ['MEI', .48, .32], ['MEI', .48, .68], ['LAT', .42, .88],
    ['ATA', .72, .42], ['ATA', .72, .58]
  ]},
  '5-3-2': { name: '5-3-2 Retranca', slots: [
    ['GOL', .05, .50], ['LAT', .20, .12], ['ZAG', .15, .32], ['ZAG', .13, .50], ['ZAG', .15, .68], ['LAT', .20, .88],
    ['VOL', .38, .30], ['VOL', .36, .50], ['MEI', .42, .70],
    ['ATA', .68, .40], ['ATA', .68, .60]
  ]},
  '4-1-4-1': { name: '4-1-4-1 Equilíbrio', slots: [
    ['GOL', .05, .50], ['LAT', .19, .16], ['ZAG', .16, .37], ['ZAG', .16, .63], ['LAT', .19, .84],
    ['VOL', .32, .50], ['PON', .50, .15], ['MEI', .49, .38], ['MEI', .49, .62], ['PON', .50, .85],
    ['ATA', .73, .50]
  ]},
  '4-4-2 Diamante': { name: '4-4-2 Diamante', slots: [
    ['GOL', .05, .50], ['LAT', .20, .16], ['ZAG', .16, .37], ['ZAG', .16, .63], ['LAT', .20, .84],
    ['VOL', .37, .50], ['MEI', .47, .22], ['MEI', .47, .78], ['MEI', .57, .50],
    ['ATA', .74, .40], ['ATA', .74, .60]
  ]}
};

export const MENTALITIES = [
  { id: 'defensiva', name: 'Defensiva', attack: -.12, defense: .14, desc: 'Linha baixa e transições seguras.' },
  { id: 'equilibrada', name: 'Equilibrada', attack: 0, defense: 0, desc: 'Equipe compacta e organizada.' },
  { id: 'ofensiva', name: 'Ofensiva', attack: .14, defense: -.1, desc: 'Pressão alta e muitos jogadores no ataque.' }
];

export const UNLOCKABLES = [
  { id: 'kit-retro', name: 'Kits Retrô 1998', type: 'uniforme', icon: '👕', price: 900, desc: 'Uniformes clássicos para todos os times.' },
  { id: 'bola-ouro', name: 'Bola de Ouro', type: 'bola', icon: '◉', price: 600, desc: 'Bola dourada com rastro luminoso.' },
  { id: 'estadio-monumental', name: 'Estádio Monumental', type: 'estadio', icon: '🏟', price: 1400, desc: 'Arena gigante com 85 mil lugares.' },
  { id: 'estadio-noturno', name: 'Arena Meia-Noite', type: 'estadio', icon: '🌙', price: 1200, desc: 'Clima noturno e refletores cinematográficos.' },
  { id: 'torcida-fogos', name: 'Torcida em Festa', type: 'torcida', icon: '🎆', price: 750, desc: 'Fogos, sinalizadores e mosaicos nas arquibancadas.' },
  { id: 'narracao-epica', name: 'Narração Épica', type: 'narracao', icon: '🎙', price: 800, desc: 'Novas falas e bordões do narrador.' },
  { id: 'camisa-ouro', name: 'Camisa de Ouro', type: 'uniforme', icon: '✦', price: 1500, desc: 'Uniforme dourado exclusivo para o seu time.' },
  { id: 'modo-lendas', name: 'Modo Lendas', type: 'modo', icon: '★', price: 2000, desc: 'Elenco de lendas desbloqueado no mercado.' }
];

const KIT = {
  'Flamengo': ['#c8102e', '#101010', '#ffffff'],
  'Palmeiras': ['#0a7b3e', '#f5f5f5', '#0a7b3e'],
  'Corinthians': ['#f2f2f2', '#111111', '#111111'],
  'São Paulo': ['#f4f4f4', '#d61f2c', '#111111'],
  'Fluminense': ['#7a1f3d', '#0f6b3c', '#f3f3f3'],
  'Botafogo': ['#111111', '#f4f4f4', '#111111'],
  'Vasco da Gama': ['#111111', '#f4f4f4', '#111111'],
  'Grêmio': ['#1c6fb5', '#111111', '#1c6fb5'],
  'Internacional': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Cruzeiro': ['#1c4fa0', '#f4f4f4', '#1c4fa0'],
  'Atlético-MG': ['#111111', '#f4f4f4', '#111111'],
  'Athletico-PR': ['#c8102e', '#111111', '#c8102e'],
  'Fortaleza': ['#1b4f9c', '#f4f4f4', '#c8102e'],
  'Bahia': ['#1d5bb5', '#f4f4f4', '#c8102e'],
  'Bragantino': ['#f4f4f4', '#111111', '#e23744'],
  'Santos': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Ceará': ['#111111', '#f4f4f4', '#c8102e'],
  'Sport': ['#c8102e', '#111111', '#f4f4f4'],
  'Juventude': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Mirassol': ['#f0c22a', '#1b7f3f', '#f4f4f4'],
  'Arsenal': ['#e32636', '#f4f4f4', '#f4f4f4'],
  'Manchester City': ['#6cabdd', '#1c2c5b', '#f4f4f4'],
  'Liverpool': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Manchester United': ['#da291c', '#f4f4f4', '#111111'],
  'Chelsea': ['#1f4fa0', '#f4f4f4', '#1f4fa0'],
  'Tottenham': ['#f4f4f4', '#1b2b5a', '#f4f4f4'],
  'Newcastle': ['#111111', '#f4f4f4', '#111111'],
  'Aston Villa': ['#7a1f3d', '#8ecae6', '#f4f4f4'],
  'Brighton': ['#1f5ea8', '#f4f4f4', '#f4f4f4'],
  'West Ham': ['#7a1f3d', '#8ecae6', '#7a1f3d'],
  'Crystal Palace': ['#1c3f94', '#c8102e', '#1c3f94'],
  'Everton': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Fulham': ['#f4f4f4', '#111111', '#111111'],
  'Brentford': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Nottingham Forest': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Bournemouth': ['#c8102e', '#111111', '#111111'],
  'Wolves': ['#f0a202', '#111111', '#111111'],
  'Leeds': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Burnley': ['#7a1f3d', '#8ecae6', '#f4f4f4'],
  'Sunderland': ['#c8102e', '#f4f4f4', '#111111'],
  'Real Madrid': ['#f4f4f4', '#f0c22a', '#f4f4f4'],
  'Barcelona': ['#a50044', '#1c3f94', '#a50044'],
  'Atlético Madrid': ['#c8102e', '#f4f4f4', '#1c3f94'],
  'Athletic Bilbao': ['#c8102e', '#f4f4f4', '#111111'],
  'Villarreal': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Real Sociedad': ['#1c6fb5', '#f4f4f4', '#1c6fb5'],
  'Betis': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Sevilla': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Valencia': ['#f4f4f4', '#f0a202', '#111111'],
  'Girona': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Celta': ['#8ecae6', '#f4f4f4', '#8ecae6'],
  'Osasuna': ['#c8102e', '#1c3f94', '#c8102e'],
  'Getafe': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Rayo': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Mallorca': ['#c8102e', '#111111', '#c8102e'],
  'Espanyol': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Alavés': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Elche': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Levante': ['#8ecae6', '#7a1f3d', '#8ecae6'],
  'Oviedo': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Inter': ['#1a2f72', '#111111', '#f4f4f4'],
  'Milan': ['#c8102e', '#111111', '#f4f4f4'],
  'Juventus': ['#f4f4f4', '#111111', '#111111'],
  'Napoli': ['#1c9bd6', '#f4f4f4', '#1c9bd6'],
  'Roma': ['#7a1f3d', '#f0a202', '#7a1f3d'],
  'Lazio': ['#8ecae6', '#f4f4f4', '#8ecae6'],
  'Atalanta': ['#1c3f94', '#111111', '#1c3f94'],
  'Fiorentina': ['#6b2c91', '#f4f4f4', '#6b2c91'],
  'Bologna': ['#c8102e', '#1c3f94', '#c8102e'],
  'Torino': ['#7a1f3d', '#f4f4f4', '#7a1f3d'],
  'Udinese': ['#111111', '#f4f4f4', '#111111'],
  'Genoa': ['#c8102e', '#1c3f94', '#c8102e'],
  'Como': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Cagliari': ['#c8102e', '#1c3f94', '#c8102e'],
  'Parma': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Lecce': ['#f0c22a', '#c8102e', '#f0c22a'],
  'Verona': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Sassuolo': ['#1b7f3f', '#111111', '#1b7f3f'],
  'Pisa': ['#111111', '#1c3f94', '#111111'],
  'Cremonese': ['#c8102e', '#8a8a8a', '#c8102e'],
  'Bayern de Munique': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Borussia Dortmund': ['#f0c22a', '#111111', '#f0c22a'],
  'Bayer Leverkusen': ['#c8102e', '#111111', '#c8102e'],
  'RB Leipzig': ['#f4f4f4', '#c8102e', '#1c3f94'],
  'Eintracht Frankfurt': ['#111111', '#c8102e', '#f4f4f4'],
  'Stuttgart': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Freiburg': ['#c8102e', '#111111', '#f4f4f4'],
  'Wolfsburg': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Mainz': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Borussia Mönchengladbach': ['#f4f4f4', '#111111', '#1b7f3f'],
  'Werder Bremen': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Augsburg': ['#f4f4f4', '#c8102e', '#1b7f3f'],
  'Hoffenheim': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Union Berlin': ['#c8102e', '#f4f4f4', '#c8102e'],
  'St. Pauli': ['#7a4a2b', '#f4f4f4', '#7a4a2b'],
  'Heidenheim': ['#c8102e', '#1c3f94', '#c8102e'],
  'Hamburgo': ['#1c3f94', '#f4f4f4', '#111111'],
  'Köln': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'PSG': ['#1c2c5b', '#c8102e', '#1c2c5b'],
  'Marseille': ['#8ecae6', '#f4f4f4', '#8ecae6'],
  'Monaco': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Lyon': ['#f4f4f4', '#1c3f94', '#c8102e'],
  'Lille': ['#c8102e', '#1c3f94', '#f4f4f4'],
  'Nice': ['#c8102e', '#111111', '#c8102e'],
  'Lens': ['#f0c22a', '#c8102e', '#f0c22a'],
  'Rennes': ['#c8102e', '#111111', '#c8102e'],
  'Strasbourg': ['#1c6fb5', '#f4f4f4', '#1c6fb5'],
  'Brest': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Toulouse': ['#6b2c91', '#f4f4f4', '#6b2c91'],
  'Auxerre': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Nantes': ['#f0c22a', '#1b7f3f', '#f0c22a'],
  'Angers': ['#111111', '#f4f4f4', '#111111'],
  'Le Havre': ['#8ecae6', '#1c2c5b', '#8ecae6'],
  'Lorient': ['#f0a202', '#111111', '#f0a202'],
  'Metz': ['#7a1f3d', '#f4f4f4', '#7a1f3d'],
  'Paris FC': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Benfica': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Porto': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Sporting': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Braga': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Vitória de Guimarães': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Famalicão': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Moreirense': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Santa Clara': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Estoril': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Rio Ave': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Arouca': ['#f0c22a', '#111111', '#f0c22a'],
  'Casa Pia': ['#111111', '#f4f4f4', '#111111'],
  'Nacional': ['#111111', '#f4f4f4', '#111111'],
  'Gil Vicente': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Estrela da Amadora': ['#c8102e', '#f0c22a', '#c8102e'],
  'AVS': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Tondela': ['#f0c22a', '#1b7f3f', '#f0c22a'],
  'Alverca': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Ajax': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'PSV': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Feyenoord': ['#c8102e', '#f4f4f4', '#111111'],
  'AZ': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Twente': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Utrecht': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Go Ahead Eagles': ['#c8102e', '#f0c22a', '#c8102e'],
  'NEC': ['#c8102e', '#1b7f3f', '#c8102e'],
  'Heerenveen': ['#1c6fb5', '#f4f4f4', '#1c6fb5'],
  'Sparta Rotterdam': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Fortuna Sittard': ['#f0c22a', '#1b7f3f', '#f0c22a'],
  'Groningen': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Zwolle': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Heracles': ['#111111', '#f4f4f4', '#111111'],
  'Willem II': ['#c8102e', '#f4f4f4', '#1c3f94'],
  'NAC Breda': ['#f0c22a', '#111111', '#f0c22a'],
  'Excelsior': ['#c8102e', '#111111', '#c8102e'],
  'Telstar': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'River Plate': ['#f4f4f4', '#c8102e', '#111111'],
  'Boca Juniors': ['#1c3f94', '#f0c22a', '#1c3f94'],
  'Racing': ['#8ecae6', '#f4f4f4', '#8ecae6'],
  'Independiente': ['#c8102e', '#f4f4f4', '#c8102e'],
  'San Lorenzo': ['#1c3f94', '#c8102e', '#1c3f94'],
  'Vélez': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Estudiantes': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Talleres': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Lanús': ['#7a1f3d', '#f4f4f4', '#7a1f3d'],
  'Argentinos Juniors': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Huracán': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  "Newell's": ['#c8102e', '#111111', '#c8102e'],
  'Rosario Central': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Defensa y Justicia': ['#1b7f3f', '#f0c22a', '#1b7f3f'],
  'Godoy Cruz': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Banfield': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Instituto': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Barracas Central': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Platense': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Sarmiento': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Peñarol': ['#f0c22a', '#111111', '#f0c22a'],
  'Nacional': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Colo-Colo': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Universidad de Chile': ['#1c3f94', '#c8102e', '#1c3f94'],
  'Atlético Nacional': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Millonarios': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'LDU Quito': ['#f4f4f4', '#c8102e', '#f4f4f4'],
  'Independiente del Valle': ['#111111', '#1b7f3f', '#111111'],
  'Olimpia': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Cerro Porteño': ['#c8102e', '#1c3f94', '#c8102e'],
  'Alianza Lima': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Universitario': ['#f4f4f4', '#7a1f3d', '#f4f4f4'],
  'Bolívar': ['#8ecae6', '#f4f4f4', '#8ecae6'],
  'Caracas': ['#c8102e', '#111111', '#c8102e'],
  'Al Hilal': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Al Nassr': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Al Ittihad': ['#f0c22a', '#111111', '#f0c22a'],
  'Al Ahli': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Al Shabab': ['#f4f4f4', '#111111', '#f4f4f4'],
  'Al Ettifaq': ['#1b7f3f', '#c8102e', '#1b7f3f'],
  'Al Taawoun': ['#f0c22a', '#1c3f94', '#f0c22a'],
  'Al Fateh': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Al Riyadh': ['#f4f4f4', '#1c3f94', '#f4f4f4'],
  'Damac': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Al Khaleej': ['#1c3f94', '#f0c22a', '#1c3f94'],
  'Al Fayha': ['#111111', '#f4f4f4', '#111111'],
  'Al Okhdood': ['#c8102e', '#111111', '#c8102e'],
  'Al Wehda': ['#c8102e', '#f4f4f4', '#c8102e'],
  'Al Qadsiah': ['#f0c22a', '#111111', '#f0c22a'],
  'Al Kholood': ['#1b7f3f', '#f4f4f4', '#1b7f3f'],
  'Al Najma': ['#1c3f94', '#f4f4f4', '#1c3f94'],
  'Al Orobah': ['#f0c22a', '#1b7f3f', '#f0c22a']
};

const STADIUM_OVERRIDE = {
  'Flamengo': ['Maracanã', 78838], 'Palmeiras': ['Allianz Parque', 43713], 'Corinthians': ['Neo Química Arena', 49205],
  'São Paulo': ['MorumBIS', 66795], 'Fluminense': ['Maracanã', 78838], 'Botafogo': ['Nilton Santos', 44661],
  'Vasco da Gama': ['São Januário', 21880], 'Grêmio': ['Arena do Grêmio', 55662], 'Internacional': ['Beira-Rio', 50128],
  'Cruzeiro': ['Mineirão', 61846], 'Atlético-MG': ['Arena MRV', 46000], 'Athletico-PR': ['Ligga Arena', 42372],
  'Fortaleza': ['Castelão', 63903], 'Bahia': ['Arena Fonte Nova', 47907], 'Santos': ['Vila Belmiro', 16068],
  'Real Madrid': ['Santiago Bernabéu', 83186], 'Barcelona': ['Spotify Camp Nou', 99354], 'Atlético Madrid': ['Metropolitano', 68456],
  'Manchester City': ['Etihad Stadium', 53400], 'Liverpool': ['Anfield', 61276], 'Arsenal': ['Emirates Stadium', 60704],
  'Manchester United': ['Old Trafford', 74310], 'Chelsea': ['Stamford Bridge', 40343], 'Tottenham': ['Tottenham Hotspur Stadium', 62850],
  'Bayern de Munique': ['Allianz Arena', 75024], 'Borussia Dortmund': ['Signal Iduna Park', 81365], 'PSG': ['Parc des Princes', 47929],
  'Inter': ['San Siro', 75923], 'Milan': ['San Siro', 75923], 'Juventus': ['Allianz Stadium', 41507], 'Napoli': ['Diego Armando Maradona', 54726],
  'Benfica': ['Estádio da Luz', 64642], 'Porto': ['Estádio do Dragão', 50033], 'Sporting': ['José Alvalade', 50095],
  'River Plate': ['Monumental', 83214], 'Boca Juniors': ['La Bombonera', 54000], 'Ajax': ['Johan Cruyff Arena', 55500],
  'PSV': ['Philips Stadion', 35000], 'Feyenoord': ['De Kuip', 47500], 'Al Hilal': ['Kingdom Arena', 25000],
  'Al Nassr': ['Al-Awwal Park', 25000], 'Al Ittihad': ['King Abdullah Sports City', 62345]
};

const STAR_MAP = {
  'Flamengo': [['Pedro', 'ATA', 87], ['Arrascaeta', 'MEI', 87], ['Bruno Henrique', 'PON', 84], ['Léo Pereira', 'ZAG', 82]],
  'Palmeiras': [['Estêvão', 'PON', 86], ['Raphael Veiga', 'MEI', 84], ['Gustavo Gómez', 'ZAG', 84]],
  'Corinthians': [['Yuri Alberto', 'ATA', 83], ['Memphis Depay', 'MEI', 84], ['Rodrigo Garro', 'MEI', 83]],
  'São Paulo': [['Lucas Moura', 'PON', 83], ['Jonathan Calleri', 'ATA', 82], ['Rafael', 'GOL', 81]],
  'Fluminense': [['Germán Cano', 'ATA', 83], ['Jhon Arias', 'PON', 82], ['Thiago Silva', 'ZAG', 83]],
  'Botafogo': [['Igor Jesus', 'ATA', 82], ['Savarino', 'MEI', 82], ['Marlon Freitas', 'VOL', 81]],
  'Vasco da Gama': [['Vegetti', 'ATA', 82], ['Payet', 'MEI', 81], ['Coutinho', 'MEI', 81]],
  'Grêmio': [['Braithwaite', 'ATA', 81], ['Cristaldo', 'MEI', 81], ['Kannemann', 'ZAG', 80]],
  'Internacional': [['Borré', 'ATA', 82], ['Alan Patrick', 'MEI', 83], ['Vitão', 'ZAG', 80]],
  'Cruzeiro': [['Kaio Jorge', 'ATA', 81], ['Matheus Pereira', 'MEI', 83], ['Cássio', 'GOL', 82]],
  'Atlético-MG': [['Hulk', 'ATA', 82], ['Gustavo Scarpa', 'MEI', 83], ['Bernard', 'PON', 80]],
  'Santos': [['Neymar', 'MEI', 87], ['Guilherme', 'ATA', 80], ['João Schmidt', 'VOL', 78]],
  'Arsenal': [['Bukayo Saka', 'PON', 89], ['Declan Rice', 'VOL', 87], ['Martin Ødegaard', 'MEI', 88], ['William Saliba', 'ZAG', 87]],
  'Manchester City': [['Erling Haaland', 'ATA', 92], ['Rodri', 'VOL', 91], ['Phil Foden', 'MEI', 88], ['Rúben Dias', 'ZAG', 87]],
  'Liverpool': [['Mohamed Salah', 'PON', 90], ['Virgil van Dijk', 'ZAG', 89], ['Florian Wirtz', 'MEI', 88]],
  'Manchester United': [['Bruno Fernandes', 'MEI', 87], ['Matheus Cunha', 'ATA', 84], ['Lisandro Martínez', 'ZAG', 84]],
  'Chelsea': [['Cole Palmer', 'MEI', 87], ['Enzo Fernández', 'VOL', 85], ['Moisés Caicedo', 'VOL', 86]],
  'Tottenham': [['Son Heung-min', 'PON', 86], ['James Maddison', 'MEI', 84], ['Cristian Romero', 'ZAG', 85]],
  'Newcastle': [['Alexander Isak', 'ATA', 87], ['Bruno Guimarães', 'VOL', 86], ['Anthony Gordon', 'PON', 84]],
  'Aston Villa': [['Ollie Watkins', 'ATA', 85], ['Morgan Rogers', 'MEI', 83], ['Emiliano Martínez', 'GOL', 87]],
  'Real Madrid': [['Vinícius Jr.', 'PON', 93], ['Kylian Mbappé', 'ATA', 93], ['Jude Bellingham', 'MEI', 91], ['Rodrygo', 'PON', 88], ['Thibaut Courtois', 'GOL', 90]],
  'Barcelona': [['Lamine Yamal', 'PON', 91], ['Robert Lewandowski', 'ATA', 89], ['Pedri', 'MEI', 89], ['Raphinha', 'PON', 89]],
  'Atlético Madrid': [['Julián Álvarez', 'ATA', 88], ['Antoine Griezmann', 'MEI', 87], ['Jan Oblak', 'GOL', 88]],
  'Athletic Bilbao': [['Nico Williams', 'PON', 85], ['Iñaki Williams', 'PON', 82], ['Unai Simón', 'GOL', 84]],
  'Villarreal': [['Ayoze Pérez', 'ATA', 82], ['Parejo', 'MEI', 82], ['Gerard Moreno', 'ATA', 82]],
  'Real Sociedad': [['Takefusa Kubo', 'PON', 83], ['Mikel Oyarzabal', 'ATA', 84], ['Martín Zubimendi', 'VOL', 83]],
  'Betis': [['Isco', 'MEI', 83], ['Antony', 'PON', 81], ['Fornals', 'MEI', 81]],
  'Sevilla': [['Dodi Lukébakio', 'PON', 81], ['Loïc Badé', 'ZAG', 81]],
  'Valencia': [['Hugo Duro', 'ATA', 80], ['Diego López', 'PON', 80]],
  'Inter': [['Lautaro Martínez', 'ATA', 88], ['Nicolò Barella', 'MEI', 87], ['Marcus Thuram', 'ATA', 85], ['Alessandro Bastoni', 'ZAG', 86]],
  'Milan': [['Rafael Leão', 'PON', 86], ['Christian Pulisic', 'PON', 85], ['Mike Maignan', 'GOL', 86]],
  'Juventus': [['Dušan Vlahović', 'ATA', 84], ['Kenan Yıldız', 'MEI', 84], ['Gleison Bremer', 'ZAG', 85]],
  'Napoli': [['Kevin De Bruyne', 'MEI', 88], ['Romelu Lukaku', 'ATA', 85], ['Scott McTominay', 'VOL', 85]],
  'Roma': [['Paulo Dybala', 'ATA', 85], ['Lorenzo Pellegrini', 'MEI', 82], ['Gianluca Mancini', 'ZAG', 82]],
  'Lazio': [['Mattia Zaccagni', 'PON', 83], ['Valentín Castellanos', 'ATA', 81]],
  'Atalanta': [['Ademola Lookman', 'PON', 85], ['Charles De Ketelaere', 'MEI', 82], ['Éderson', 'VOL', 82]],
  'Fiorentina': [['Moise Kean', 'ATA', 83], ['Albert Gudmundsson', 'MEI', 82]],
  'Bayern de Munique': [['Harry Kane', 'ATA', 91], ['Jamal Musiala', 'MEI', 89], ['Joshua Kimmich', 'VOL', 88], ['Manuel Neuer', 'GOL', 88]],
  'Borussia Dortmund': [['Serhou Guirassy', 'ATA', 85], ['Julian Brandt', 'MEI', 84], ['Karim Adeyemi', 'PON', 82]],
  'Bayer Leverkusen': [['Florian Wirtz', 'MEI', 88], ['Patrik Schick', 'ATA', 84], ['Granit Xhaka', 'VOL', 84]],
  'RB Leipzig': [['Loïs Openda', 'ATA', 84], ['Xavi Simons', 'MEI', 84], ['Antonio Nusa', 'PON', 82]],
  'Eintracht Frankfurt': [['Hugo Ekitiké', 'ATA', 83], ['Mario Götze', 'MEI', 82]],
  'PSG': [['Ousmane Dembélé', 'PON', 89], ['Vitinha', 'MEI', 88], ['Achraf Hakimi', 'LAT', 86], ['Gianluigi Donnarumma', 'GOL', 87]],
  'Marseille': [['Mason Greenwood', 'PON', 83], ['Amine Gouiri', 'ATA', 82], ['Adrien Rabiot', 'MEI', 84]],
  'Monaco': [['Folarin Balogun', 'ATA', 81], ['Aleksandr Golovin', 'MEI', 83], ['Takumi Minamino', 'MEI', 82]],
  'Lyon': [['Corentin Tolisso', 'MEI', 82], ['Malick Fofana', 'PON', 81], ['Alexandre Lacazette', 'ATA', 82]],
  'Lille': [['Jonathan David', 'ATA', 84], ['Edon Zhegrova', 'PON', 82], ['Lucas Chevalier', 'GOL', 82]],
  'Benfica': [['Vangelis Pavlidis', 'ATA', 83], ['Nicolás Otamendi', 'ZAG', 83], ['Ángel Di María', 'PON', 84]],
  'Porto': [['Rodrigo Mora', 'MEI', 84], ['Pepê', 'PON', 83], ['Diogo Costa', 'GOL', 86]],
  'Sporting': [['Viktor Gyökeres', 'ATA', 88], ['Trincão', 'PON', 84], ['Morten Hjulmand', 'VOL', 84]],
  'Ajax': [['Kenneth Taylor', 'MEI', 82], ['Mika Godts', 'PON', 80], ['Remko Pasveer', 'GOL', 80]],
  'PSV': [['Luuk de Jong', 'ATA', 82], ['Noa Lang', 'PON', 82], ['Ricardo Pepi', 'ATA', 80]],
  'Feyenoord': [['Santiago Giménez', 'ATA', 83], ['Antoni Milambo', 'MEI', 81], ['Quinten Timber', 'VOL', 82]],
  'River Plate': [['Franco Mastantuono', 'MEI', 84], ['Sebastián Driussi', 'MEI', 82], ['Franco Armani', 'GOL', 83]],
  'Boca Juniors': [['Edinson Cavani', 'ATA', 82], ['Juan Román Riquelme Jr.', 'MEI', 80], ['Luis Advíncula', 'LAT', 80]],
  'Racing': [['Adrián Martínez', 'ATA', 81], ['Juan Nardoni', 'MEI', 80]],
  'Independiente': [['Gabriel Ávalos', 'ATA', 81], ['Santiago Montiel', 'PON', 80]],
  'Vélez': [['Thiago Almada', 'MEI', 84], ['Brian Romero', 'ATA', 80]],
  'Al Hilal': [['Salem Al-Dawsari', 'PON', 85], ['Mitrovic', 'ATA', 85], ['Rúben Neves', 'VOL', 85], ['Bono', 'GOL', 84]],
  'Al Nassr': [['Cristiano Ronaldo', 'ATA', 88], ['Sadio Mané', 'PON', 85], ['Marcelo Brozović', 'VOL', 85]],
  'Al Ittihad': [['Karim Benzema', 'ATA', 86], ['Houssem Aouar', 'MEI', 82], ['Moussa Diaby', 'PON', 84]],
  'Al Ahli': [['Riyad Mahrez', 'PON', 85], ['Ivan Toney', 'ATA', 84], ['Édouard Mendy', 'GOL', 83]]
};

const NATIONAL_STARS = {
  'Brasil': [['Vinícius Jr.', 'PON', 93], ['Rodrygo', 'PON', 88], ['Raphinha', 'PON', 89], ['Bruno Guimarães', 'VOL', 86], ['Alisson', 'GOL', 89], ['Marquinhos', 'ZAG', 86]],
  'Argentina': [['Lionel Messi', 'MEI', 92], ['Julián Álvarez', 'ATA', 88], ['Lautaro Martínez', 'ATA', 88], ['Enzo Fernández', 'VOL', 85], ['Emiliano Martínez', 'GOL', 87]],
  'França': [['Kylian Mbappé', 'ATA', 93], ['Ousmane Dembélé', 'PON', 89], ['Aurélien Tchouaméni', 'VOL', 86], ['Mike Maignan', 'GOL', 86]],
  'Inglaterra': [['Harry Kane', 'ATA', 91], ['Jude Bellingham', 'MEI', 91], ['Bukayo Saka', 'PON', 89], ['Declan Rice', 'VOL', 87]],
  'Espanha': [['Lamine Yamal', 'PON', 91], ['Pedri', 'MEI', 89], ['Rodri', 'VOL', 91], ['Unai Simón', 'GOL', 84]],
  'Portugal': [['Cristiano Ronaldo', 'ATA', 88], ['Bruno Fernandes', 'MEI', 87], ['Rafael Leão', 'PON', 86], ['Diogo Costa', 'GOL', 86]],
  'Alemanha': [['Jamal Musiala', 'MEI', 89], ['Florian Wirtz', 'MEI', 88], ['Joshua Kimmich', 'VOL', 88], ['Manuel Neuer', 'GOL', 88]],
  'Itália': [['Nicolò Barella', 'MEI', 87], ['Gianluigi Donnarumma', 'GOL', 87], ['Alessandro Bastoni', 'ZAG', 86]],
  'Holanda': [['Virgil van Dijk', 'ZAG', 89], ['Cody Gakpo', 'PON', 84], ['Frenkie de Jong', 'MEI', 86]],
  'Bélgica': [['Kevin De Bruyne', 'MEI', 88], ['Romelu Lukaku', 'ATA', 85], ['Thibaut Courtois', 'GOL', 90]],
  'Croácia': [['Luka Modrić', 'MEI', 86], ['Joško Gvardiol', 'ZAG', 85], ['Andrej Kramarić', 'ATA', 83]],
  'Uruguai': [['Federico Valverde', 'MEI', 88], ['Darwin Núñez', 'ATA', 84], ['Ronald Araújo', 'ZAG', 85]],
  'Colômbia': [['Luis Díaz', 'PON', 87], ['James Rodríguez', 'MEI', 84], ['Jhon Durán', 'ATA', 82]],
  'México': [['Santiago Giménez', 'ATA', 83], ['Edson Álvarez', 'VOL', 83], ['Guillermo Ochoa', 'GOL', 81]],
  'Estados Unidos': [['Christian Pulisic', 'PON', 85], ['Weston McKennie', 'MEI', 82], ['Antonee Robinson', 'LAT', 82]],
  'Japão': [['Takefusa Kubo', 'PON', 83], ['Kaoru Mitoma', 'PON', 83], ['Wataru Endo', 'VOL', 81]],
  'Coreia do Sul': [['Son Heung-min', 'PON', 86], ['Lee Kang-in', 'MEI', 83], ['Kim Min-jae', 'ZAG', 85]],
  'Marrocos': [['Achraf Hakimi', 'LAT', 86], ['Brahim Díaz', 'PON', 84], ['Yassine Bounou', 'GOL', 84]],
  'Senegal': [['Sadio Mané', 'PON', 85], ['Nicolas Jackson', 'ATA', 82], ['Kalidou Koulibaly', 'ZAG', 83]],
  'Nigéria': [['Victor Osimhen', 'ATA', 87], ['Ademola Lookman', 'PON', 85], ['Alex Iwobi', 'MEI', 82]],
  'Egito': [['Mohamed Salah', 'PON', 90], ['Omar Marmoush', 'ATA', 84]],
  'Austrália': [['Mathew Ryan', 'GOL', 80], ['Jackson Irvine', 'MEI', 79]],
  'Suíça': [['Granit Xhaka', 'VOL', 84], ['Manuel Akanji', 'ZAG', 84], ['Yann Sommer', 'GOL', 84]],
  'Dinamarca': [['Christian Eriksen', 'MEI', 84], ['Rasmus Højlund', 'ATA', 83], ['Kasper Schmeichel', 'GOL', 82]],
  'Suécia': [['Alexander Isak', 'ATA', 87], ['Viktor Gyökeres', 'ATA', 88], ['Dejan Kulusevski', 'MEI', 84]],
  'Noruega': [['Erling Haaland', 'ATA', 92], ['Martin Ødegaard', 'MEI', 88]],
  'Polônia': [['Robert Lewandowski', 'ATA', 89], ['Piotr Zieliński', 'MEI', 84], ['Wojciech Szczęsny', 'GOL', 84]],
  'Sérvia': [['Dušan Vlahović', 'ATA', 84], ['Sergej Milinković-Savić', 'MEI', 85]],
  'Turquia': [['Hakan Çalhanoğlu', 'MEI', 86], ['Kenan Yıldız', 'MEI', 84], ['Arda Güler', 'MEI', 84]],
  'Chile': [['Alexis Sánchez', 'ATA', 82], ['Arturo Vidal', 'MEI', 81]],
  'Equador': [['Moisés Caicedo', 'VOL', 86], ['Piero Hincapié', 'ZAG', 83]],
  'Paraguai': [['Miguel Almirón', 'PON', 81], ['Julio Enciso', 'MEI', 81]],
  'Canadá': [['Alphonso Davies', 'LAT', 86], ['Jonathan David', 'ATA', 84]],
  'Gana': [['Mohammed Kudus', 'MEI', 84], ['Thomas Partey', 'VOL', 82]],
  'Costa do Marfim': [['Simon Adingra', 'PON', 81], ['Franck Kessié', 'VOL', 82]],
  'Camarões': [['Vincent Aboubakar', 'ATA', 80], ['André Onana', 'GOL', 83]],
  'Arábia Saudita': [['Salem Al-Dawsari', 'PON', 85], ['Firas Al-Buraikan', 'ATA', 80]],
  'Catar': [['Akram Afif', 'MEI', 82], ['Almoez Ali', 'ATA', 80]],
  'Irã': [['Mehdi Taremi', 'ATA', 83], ['Sardar Azmoun', 'ATA', 81]],
  'Costa Rica': [['Keylor Navas', 'GOL', 83], ['Manfred Ugalde', 'ATA', 80]]
};

const LEAGUE_DATA = [
  { id: 'brasileirao', name: 'Brasileirão Série A', country: 'Brasil', confed: 'CONMEBOL', color: '#00d26a', tier: 1, teams: [
    ['Flamengo','Rio de Janeiro',86],['Palmeiras','São Paulo',85],['Corinthians','São Paulo',81],['São Paulo','São Paulo',81],
    ['Fluminense','Rio de Janeiro',80],['Botafogo','Rio de Janeiro',82],['Vasco da Gama','Rio de Janeiro',79],['Grêmio','Porto Alegre',80],
    ['Internacional','Porto Alegre',81],['Cruzeiro','Belo Horizonte',81],['Atlético-MG','Belo Horizonte',81],['Athletico-PR','Curitiba',77],
    ['Fortaleza','Fortaleza',77],['Bahia','Salvador',78],['Bragantino','Bragança Paulista',76],['Santos','Santos',79],
    ['Ceará','Fortaleza',74],['Sport','Recife',73],['Juventude','Caxias do Sul',72],['Mirassol','Mirassol',72]
  ]},
  { id: 'premier', name: 'Premier League', country: 'Inglaterra', confed: 'UEFA', color: '#9b6bff', tier: 1, teams: [
    ['Arsenal','Londres',87],['Manchester City','Manchester',89],['Liverpool','Liverpool',88],['Manchester United','Manchester',82],
    ['Chelsea','Londres',83],['Tottenham','Londres',82],['Newcastle','Newcastle',83],['Aston Villa','Birmingham',82],
    ['Brighton','Brighton',79],['West Ham','Londres',78],['Crystal Palace','Londres',78],['Everton','Liverpool',76],
    ['Fulham','Londres',77],['Brentford','Londres',77],['Nottingham Forest','Nottingham',78],['Bournemouth','Bournemouth',77],
    ['Wolves','Wolverhampton',75],['Leeds','Leeds',74],['Burnley','Burnley',72],['Sunderland','Sunderland',73]
  ]},
  { id: 'laliga', name: 'LaLiga EA Sports', country: 'Espanha', confed: 'UEFA', color: '#ff7b3c', tier: 1, teams: [
    ['Real Madrid','Madri',89],['Barcelona','Barcelona',88],['Atlético Madrid','Madri',85],['Athletic Bilbao','Bilbao',83],
    ['Villarreal','Villarreal',81],['Real Sociedad','San Sebastián',81],['Betis','Sevilha',80],['Sevilla','Sevilha',79],
    ['Valencia','Valência',78],['Girona','Girona',78],['Celta','Vigo',76],['Osasuna','Pamplona',76],
    ['Getafe','Getafe',74],['Rayo','Madri',75],['Mallorca','Palma',75],['Espanyol','Barcelona',74],
    ['Alavés','Vitoria',74],['Elche','Elche',73],['Levante','Valência',72],['Oviedo','Oviedo',71]
  ]},
  { id: 'seriea', name: 'Serie A Italiana', country: 'Itália', confed: 'UEFA', color: '#54a8ff', tier: 1, teams: [
    ['Inter','Milão',87],['Milan','Milão',84],['Juventus','Turim',84],['Napoli','Nápoles',86],
    ['Roma','Roma',82],['Lazio','Roma',81],['Atalanta','Bérgamo',83],['Fiorentina','Florença',80],
    ['Bologna','Bolonha',80],['Torino','Turim',76],['Udinese','Udine',76],['Genoa','Gênova',75],
    ['Como','Como',75],['Cagliari','Cagliari',73],['Parma','Parma',73],['Lecce','Lecce',72],
    ['Verona','Verona',72],['Sassuolo','Sassuolo',74],['Pisa','Pisa',71],['Cremonese','Cremona',72]
  ]},
  { id: 'bundesliga', name: 'Bundesliga', country: 'Alemanha', confed: 'UEFA', color: '#ff4a5a', tier: 1, teams: [
    ['Bayern de Munique','Munique',89],['Borussia Dortmund','Dortmund',84],['Bayer Leverkusen','Leverkusen',85],['RB Leipzig','Leipzig',83],
    ['Eintracht Frankfurt','Frankfurt',81],['Stuttgart','Stuttgart',80],['Freiburg','Freiburg',78],['Wolfsburg','Wolfsburg',77],
    ['Mainz','Mainz',77],['Borussia Mönchengladbach','Mönchengladbach',77],['Werder Bremen','Bremen',76],['Augsburg','Augsburg',75],
    ['Hoffenheim','Sinsheim',75],['Union Berlin','Berlim',74],['St. Pauli','Hamburgo',72],['Heidenheim','Heidenheim',71],
    ['Hamburgo','Hamburgo',73],['Köln','Colônia',73]
  ]},
  { id: 'ligue1', name: 'Ligue 1 McDonald\'s', country: 'França', confed: 'UEFA', color: '#36e5c0', tier: 1, teams: [
    ['PSG','Paris',88],['Marseille','Marselha',82],['Monaco','Mônaco',81],['Lyon','Lyon',79],
    ['Lille','Lille',80],['Nice','Nice',79],['Lens','Lens',79],['Rennes','Rennes',77],
    ['Strasbourg','Estrasburgo',77],['Brest','Brest',75],['Toulouse','Toulouse',74],['Auxerre','Auxerre',72],
    ['Nantes','Nantes',72],['Angers','Angers',71],['Le Havre','Le Havre',71],['Lorient','Lorient',71],
    ['Metz','Metz',70],['Paris FC','Paris',72]
  ]},
  { id: 'primeira', name: 'Liga Portugal', country: 'Portugal', confed: 'UEFA', color: '#ffd84a', tier: 2, teams: [
    ['Benfica','Lisboa',84],['Porto','Porto',84],['Sporting','Lisboa',85],['Braga','Braga',80],
    ['Vitória de Guimarães','Guimarães',76],['Famalicão','Famalicão',74],['Moreirense','Moreirense',73],['Santa Clara','Açores',71],
    ['Estoril','Estoril',71],['Rio Ave','Vila do Conde',70],['Arouca','Arouca',72],['Casa Pia','Lisboa',70],
    ['Nacional','Madeira',70],['Gil Vicente','Barcelos',71],['Estrela da Amadora','Amadora',70],['AVS','Vila das Aves',69],
    ['Tondela','Tondela',68],['Alverca','Alverca',68]
  ]},
  { id: 'eredivisie', name: 'Eredivisie', country: 'Holanda', confed: 'UEFA', color: '#ff8a3c', tier: 2, teams: [
    ['Ajax','Amsterdã',80],['PSV','Eindhoven',82],['Feyenoord','Roterdã',81],['AZ','Alkmaar',78],
    ['Twente','Enschede',77],['Utrecht','Utrecht',76],['Go Ahead Eagles','Deventer',73],['NEC','Nijmegen',73],
    ['Heerenveen','Heerenveen',71],['Sparta Rotterdam','Roterdã',71],['Fortuna Sittard','Sittard',70],['Groningen','Groningen',72],
    ['Zwolle','Zwolle',70],['Heracles','Almelo',69],['Willem II','Tilburg',69],['NAC Breda','Breda',69],
    ['Excelsior','Roterdã',68],['Telstar','Velsen',67]
  ]},
  { id: 'argentina', name: 'Liga Profesional Argentina', country: 'Argentina', confed: 'CONMEBOL', color: '#8ecaff', tier: 2, teams: [
    ['River Plate','Buenos Aires',82],['Boca Juniors','Buenos Aires',80],['Racing','Avellaneda',80],['Independiente','Avellaneda',78],
    ['San Lorenzo','Buenos Aires',76],['Vélez','Buenos Aires',79],['Estudiantes','La Plata',78],['Talleres','Córdoba',78],
    ['Lanús','Lanús',76],['Argentinos Juniors','Buenos Aires',75],['Huracán','Buenos Aires',75],["Newell's",'Rosário',75],
    ['Rosario Central','Rosário',77],['Defensa y Justicia','Florencio Varela',75],['Godoy Cruz','Mendoza',73],['Banfield','Banfield',73],
    ['Instituto','Córdoba',72],['Barracas Central','Buenos Aires',72],['Platense','Vicente López',72],['Sarmiento','Junín',71]
  ]},
  { id: 'sudamericana', name: 'Liga Sul-Americana', country: 'América do Sul', confed: 'CONMEBOL', color: '#c8ff3d', tier: 2, teams: [
    ['Peñarol','Montevidéu',78],['Nacional','Montevidéu',77],['Colo-Colo','Santiago',78],['Universidad de Chile','Santiago',76],
    ['Atlético Nacional','Medellín',78],['Millonarios','Bogotá',76],['LDU Quito','Quito',77],['Independiente del Valle','Sangolquí',78],
    ['Olimpia','Assunção',76],['Cerro Porteño','Assunção',76],['Alianza Lima','Lima',74],['Universitario','Lima',74],
    ['Bolívar','La Paz',75],['Caracas','Caracas',72]
  ]},
  { id: 'saudita', name: 'Saudi Pro League', country: 'Arábia Saudita', confed: 'AFC', color: '#23b26d', tier: 2, teams: [
    ['Al Hilal','Riade',82],['Al Nassr','Riade',82],['Al Ittihad','Jidá',80],['Al Ahli','Jidá',80],
    ['Al Shabab','Riade',76],['Al Ettifaq','Damã',75],['Al Taawoun','Buraidah',74],['Al Fateh','Al-Hasa',73],
    ['Al Riyadh','Riade',72],['Damac','Khamis Mushait',72],['Al Khaleej','Saihat',71],['Al Fayha','Al-Majma\'ah',71],
    ['Al Okhdood','Najran',70],['Al Wehda','Meca',71],['Al Qadsiah','Khobar',74],['Al Kholood','Ar Rass',69],
    ['Al Najma','Unaizah',68],['Al Orobah','Al-Jawf',68]
  ]}
];

const NATIONAL_DATA = [
  ['Brasil','Brasil','CONMEBOL',91,'#ffd84a','#1b7f3f'],['Argentina','Argentina','CONMEBOL',89,'#8ecae6','#f4f4f4'],
  ['França','França','UEFA',90,'#1c3f94','#f4f4f4'],['Inglaterra','Inglaterra','UEFA',89,'#f4f4f4','#c8102e'],
  ['Espanha','Espanha','UEFA',89,'#c8102e','#f0c22a'],['Portugal','Portugal','UEFA',87,'#c8102e','#1b7f3f'],
  ['Alemanha','Alemanha','UEFA',88,'#f4f4f4','#111111'],['Itália','Itália','UEFA',86,'#1c3f94','#f4f4f4'],
  ['Holanda','Holanda','UEFA',87,'#f0a202','#111111'],['Bélgica','Bélgica','UEFA',85,'#c8102e','#111111'],
  ['Croácia','Croácia','UEFA',84,'#f4f4f4','#c8102e'],['Uruguai','Uruguai','CONMEBOL',85,'#8ecae6','#111111'],
  ['Colômbia','Colômbia','CONMEBOL',84,'#f0c22a','#1c3f94'],['México','México','CONCACAF',81,'#1b7f3f','#f4f4f4'],
  ['Estados Unidos','Estados Unidos','CONCACAF',81,'#f4f4f4','#1c3f94'],['Japão','Japão','AFC',82,'#1c3f94','#f4f4f4'],
  ['Coreia do Sul','Coreia do Sul','AFC',81,'#c8102e','#f4f4f4'],['Marrocos','Marrocos','CAF',83,'#c8102e','#1b7f3f'],
  ['Senegal','Senegal','CAF',81,'#1b7f3f','#f0c22a'],['Nigéria','Nigéria','CAF',82,'#1b7f3f','#f4f4f4'],
  ['Egito','Egito','CAF',80,'#c8102e','#f4f4f4'],['Austrália','Austrália','AFC',78,'#f0c22a','#1b7f3f'],
  ['Suíça','Suíça','UEFA',81,'#c8102e','#f4f4f4'],['Dinamarca','Dinamarca','UEFA',81,'#c8102e','#f4f4f4'],
  ['Suécia','Suécia','UEFA',80,'#1c3f94','#f0c22a'],['Noruega','Noruega','UEFA',81,'#c8102e','#1c3f94'],
  ['Polônia','Polônia','UEFA',80,'#f4f4f4','#c8102e'],['Sérvia','Sérvia','UEFA',80,'#c8102e','#1c3f94'],
  ['Turquia','Turquia','UEFA',81,'#c8102e','#f4f4f4'],['Chile','Chile','CONMEBOL',78,'#c8102e','#1c3f94'],
  ['Equador','Equador','CONMEBOL',81,'#f0c22a','#1c3f94'],['Paraguai','Paraguai','CONMEBOL',78,'#c8102e','#1c3f94'],
  ['Canadá','Canadá','CONCACAF',79,'#c8102e','#f4f4f4'],['Gana','Gana','CAF',78,'#c8102e','#f0c22a'],
  ['Costa do Marfim','Costa do Marfim','CAF',78,'#ff7b3c','#1b7f3f'],['Camarões','Camarões','CAF',77,'#1b7f3f','#c8102e'],
  ['Arábia Saudita','Arábia Saudita','AFC',77,'#1b7f3f','#f4f4f4'],['Catar','Catar','AFC',76,'#7a1f3d','#f4f4f4'],
  ['Irã','Irã','AFC',77,'#f4f4f4','#c8102e'],['Costa Rica','Costa Rica','CONCACAF',75,'#c8102e','#1c3f94']
];

const FIRST = {
  'Brasil': ['Gabriel','Lucas','Matheus','João','Pedro','Rafael','Bruno','Thiago','Felipe','Gustavo','Vinícius','Éder','Caio','Danilo','Rodrigo','Marcelo','André','Diego','Fábio','Renato','Igor','Léo','Vitor','Wesley','Yuri','Kaio','Murilo','Nathan','Otávio','Paulo','Ricardo','Samuel','Tales','Adriano','Breno','Cauã','Davi','Elias','Fernando','Guilherme'],
  'Argentina': ['Lucas','Mateo','Santiago','Juan','Emiliano','Franco','Nicolás','Lautaro','Julián','Facundo','Gonzalo','Tomás','Agustín','Enzo','Bruno','Maximiliano','Joaquín','Ramiro','Valentín','Leandro','Ignacio','Federico','Manuel','Benjamín','Thiago','Ezequiel','Alejandro','Diego','Martín','Rodrigo','Alan','Cristian','Exequiel','Germán','Hernán','Luis','Marcos','Pablo','Sebastián','Ariel'],
  'Portugal': ['João','Diogo','Rafael','Tiago','Pedro','Miguel','André','Bernardo','Gonçalo','Rúben','Bruno','Nuno','Fábio','Hugo','Ricardo','Vítor','Daniel','Duarte','Francisco','Guilherme','Henrique','Ivo','José','Leonardo','Luís','Manuel','Nelson','Paulo','Rodrigo','Samuel','Tomás','Vasco','Afonso','Alexandre','António','Carlos','Eduardo','Fernando','Jorge','Marco'],
  'Espanha': ['Alejandro','Sergio','Álvaro','Iker','Pablo','Javier','Adrián','Marcos','Diego','Rubén','Carlos','David','Hugo','Daniel','Mario','Santiago','Raúl','Iván','Jorge','Luis','Miguel','Andrés','Fernando','Gonzalo','José','Manuel','Nicolás','Óscar','Pedro','Roberto','Víctor','Aitor','Borja','Dani','Eduardo','Enrique','Francisco','Gerard','Ismael','Javi'],
  'Inglaterra': ['James','Harry','Jack','Oliver','George','Charlie','Thomas','Jacob','Alfie','Freddie','Callum','Ethan','Mason','Liam','Noah','Oscar','Ryan','Samuel','William','Ben','Connor','Daniel','Elliot','Finley','Harvey','Joe','Jordan','Kieran','Lewis','Luke','Max','Nathan','Reece','Rhys','Toby','Tyler','Archie','Blake','Dylan','Josh'],
  'França': ['Lucas','Hugo','Théo','Nathan','Enzo','Louis','Gabriel','Jules','Arthur','Rayan','Adam','Maël','Noah','Léo','Ethan','Mathis','Nolan','Rayan','Sacha','Yanis','Ayoub','Bilal','Clément','Dorian','Florian','Gaël','Ibrahim','Kylian','Loïc','Malik','Mathéo','Maxence','Moussa','Nicolas','Ousmane','Quentin','Romain','Samuel','Tristan','Valentin'],
  'Itália': ['Lorenzo','Matteo','Alessandro','Marco','Andrea','Davide','Gabriele','Simone','Riccardo','Federico','Luca','Francesco','Antonio','Giuseppe','Stefano','Nicolò','Tommaso','Samuele','Diego','Edoardo','Filippo','Leonardo','Manuel','Michele','Pietro','Roberto','Salvatore','Vincenzo','Alberto','Cristian','Daniele','Emanuele','Fabio','Giacomo','Giovanni','Luigi','Massimo','Paolo','Sergio','Valerio'],
  'Alemanha': ['Leon','Paul','Finn','Lukas','Jonas','Maximilian','Felix','Tim','Jan','Niklas','Kevin','Marvin','Moritz','Nico','Pascal','Philipp','Sebastian','Simon','Tobias','Florian','David','Dennis','Elias','Fabian','Julian','Kai','Lars','Marc','Matthias','Michael','Noah','Ole','Rafael','Sven','Thomas','Timo','Valentin','Yannick','Erik','Jannik'],
  'Holanda': ['Daan','Sem','Milan','Lucas','Levi','Luuk','Bram','Finn','Jesse','Noah','Thijs','Ruben','Tim','Jayden','Sven','Jens','Stijn','Tijn','Mees','Lars','Niels','Tom','Wout','Joris','Koen','Rik','Bas','Sander','Dennis','Kevin','Rick','Stefan','Timo','Joost','Mats','Teun','Gijs','Youri','Jurriën','Cody'],
  'Japão': ['Sota','Ren','Yuto','Kaito','Haruto','Riku','Yuki','Sho','Takumi','Kenta','Daiki','Hayato','Hiroto','Itsuki','Koki','Minato','Naoki','Ryo','Shun','Taiga','Tatsuya','Yuma','Aoi','Hikaru','Kazuki','Keita','Masato','Reo','Ryota','Satoshi','Shinji','Tsubasa','Yamato','Yuji','Kenji','Makoto','Noboru','Osamu','Takeshi','Yosuke'],
  'Coreia do Sul': ['Min-jun','Ji-hoon','Seo-jun','Do-yun','Ha-joon','Ji-woo','Jun-seo','Si-woo','Ye-jun','Min-seo','Ji-min','Seo-yeon','Hyun-woo','Joon-ho','Sung-min','Tae-yang','Woo-jin','Jae-hyun','Dong-hyun','Seung-ho','Young-jin','Kang-min','Byung-ho','Chan-woo','Ho-jin','Jin-woo','Kyung-ho','Sang-min','Yong-jin','Jae-sung','Dae-ho','Hee-chan','Il-woo','Kyu-tae','Myung-ho','Nam-il','Sang-ho','Won-jun','Yoon-seo','Tae-ho'],
  'Marrocos': ['Youssef','Amine','Hamza','Ayoub','Mehdi','Ilyas','Ismail','Nabil','Rachid','Sofiane','Yassine','Zakaria','Anas','Bilal','Hakim','Ibrahim','Karim','Mounir','Noureddine','Omar','Reda','Saïd','Tarik','Walid','Younes','Adil','Aziz','Badr','Driss','Fouad','Hicham','Jalal','Khalid','Larbi','Mustapha','Rachid','Salah','Tahir','Zine','Ayoub'],
  'Senegal': ['Moussa','Ibrahima','Cheikh','Mamadou','Abdoulaye','Ousmane','Pape','Lamine','Idrissa','Kalidou','Sadio','Édouard','Nicolas','Ismaïla','Boulaye','Famara','Habib','Krepin','Nampalys','Youssouf','Aliou','Baba','Cissé','Demba','El Hadji','Fodé','Gana','Henri','Ibou','Jules','Krépin','Lassana','Malick','Modou','Ndiaye','Oumar','Pathé','Saliou','Souleymane','Youssou'],
  'Nigéria': ['Chinedu','Emeka','Ifeanyi','Obinna','Uche','Ahmed','Musa','Samuel','Victor','Ademola','Kelechi','Wilfred','Alex','Joe','Terem','Cyriel','Calvin','Bright','Frank','Raphael','Semi','Tobi','Fisayo','Noah','Emmanuel','Daniel','Peter','Paul','John','Michael','David','Joseph','Ibrahim','Yusuf','Sadiq','Kingsley','Ola','Oluwaseun','Chidi','Nnamdi'],
  'Egito': ['Mohamed','Ahmed','Mahmoud','Mostafa','Omar','Youssef','Karim','Tarek','Hassan','Ali','Amr','Hossam','Ibrahim','Khaled','Moustafa','Nabil','Ramy','Salah','Sherif','Wael','Yasser','Zaki','Adel','Ashraf','Ayman','Ehab','Essam','Fathi','Gamal','Hany','Hazem','Islam','Kamal','Magdy','Maged','Marwan','Nader','Osama','Sameh','Tamer'],
  'Austrália': ['Jack','Oliver','William','Noah','Thomas','Henry','Lucas','Cooper','Hunter','Mason','Ethan','Liam','James','Charlie','Jacob','Riley','Aiden','Archie','Blake','Caleb','Dylan','Elijah','Flynn','Grayson','Harrison','Isaac','Jake','Kai','Logan','Luke','Max','Nate','Oscar','Ryan','Samuel','Tyler','Xavier','Zane','Brodie','Mitchell'],
  'Suíça': ['Noah','Liam','Leon','Matteo','Luca','Elias','Nico','David','Julian','Marco','Leandro','Dario','Fabio','Ivan','Jan','Kevin','Lars','Marvin','Nils','Pascal','Ramon','Sandro','Simon','Timo','Tobias','Valentin','Yannick','Andrin','Cédric','Dennis','Flurin','Gian','Joël','Loris','Mauro','Nando','Raphael','Silvan','Vito','Andri'],
  'Dinamarca': ['William','Oscar','Noah','Carl','Emil','Lucas','Malthe','Frederik','Mikkel','Magnus','Oliver','Valdemar','Alexander','Anton','Benjamin','Christian','Daniel','Elias','Felix','Gustav','Henrik','Jacob','Jonas','Kasper','Lasse','Mads','Martin','Mathias','Morten','Nikolaj','Rasmus','Sander','Sebastian','Simon','Søren','Tobias','Victor','Anders','Bent','Erik'],
  'Suécia': ['William','Oscar','Hugo','Liam','Noah','Elias','Adam','Alexander','Axel','Erik','Filip','Gustav','Henrik','Isak','Johan','Jonas','Karl','Lars','Leo','Linus','Lucas','Magnus','Martin','Mattias','Max','Mikael','Nils','Olle','Oskar','Patrik','Per','Rasmus','Samuel','Simon','Stefan','Sven','Theo','Thomas','Viktor','Ville'],
  'Noruega': ['Jakob','Emil','Noah','Oliver','William','Lucas','Mathias','Magnus','Martin','Sander','Tobias','Elias','Henrik','Jonas','Kristian','Lars','Marius','Nils','Ole','Øyvind','Peder','Rune','Sigurd','Simen','Sondre','Steinar','Svein','Terje','Thomas','Torgeir','Trond','Vegard','Anders','Are','Bjørn','Eirik','Espen','Fredrik','Geir','Halvor'],
  'Polônia': ['Jakub','Kacper','Szymon','Antoni','Filip','Jan','Michał','Wojciech','Piotr','Paweł','Mateusz','Bartosz','Tomasz','Marcin','Krzysztof','Adam','Mikołaj','Aleksander','Igor','Wiktor','Maciej','Łukasz','Damian','Rafał','Sebastian','Dawid','Grzegorz','Karol','Konrad','Marek','Patryk','Radosław','Robert','Stanisław','Witold','Zbigniew','Andrzej','Cezary','Henryk','Jacek'],
  'Sérvia': ['Nikola','Luka','Stefan','Marko','Aleksandar','Dušan','Miloš','Nemanja','Lazar','Filip','Bogdan','Vuk','Uroš','Andrej','Darko','Dejan','Dragan','Goran','Ivan','Jovan','Kosta','Milan','Miloje','Miroslav','Nenad','Ognjen','Pavle','Petar','Predrag','Radovan','Saša','Slobodan','Strahinja','Todor','Veljko','Vladimir','Zoran','Željko','Branko','Čedomir'],
  'Turquia': ['Emir','Yusuf','Mert','Kerem','Arda','Eren','Hakan','Ali','Berk','Can','Cem','Deniz','Ege','Furkan','Gökhan','Hasan','İbrahim','Kaan','Levent','Mehmet','Mert','Murat','Oğuz','Onur','Ömer','Orhan','Osman','Serkan','Tolga','Umut','Volkan','Yasin','Yiğit','Zeki','Burak','Cenk','Çağlar','Doğan','Efe','Fırat'],
  'Chile': ['Matías','Benjamín','Vicente','Martín','Joaquín','Sebastián','Diego','Tomás','Cristóbal','Ignacio','Lucas','Felipe','Nicolás','Andrés','Carlos','Eduardo','Francisco','Gabriel','Gonzalo','Guillermo','Javier','Jorge','Juan','Luis','Mauricio','Miguel','Pablo','Patricio','Pedro','Rafael','Ricardo','Roberto','Rodrigo','Sergio','Víctor','Álvaro','Camilo','Esteban','Fernando','Marcelo'],
  'Equador': ['Mateo','Sebastián','Daniel','Alejandro','Carlos','Andrés','José','Luis','Jhon','Moisés','Enner','Ángel','Pervis','Félix','Gonzalo','Byron','Cristian','Darwin','Edison','Erick','Franklin','Gabriel','Hugo','Iván','Jackson','Jefferson','Joao','Jordy','Kendry','Leonardo','Marcos','Mario','Michael','Nelson','Óscar','Pablo','Patricio','Richard','Robert','Washington'],
  'Paraguai': ['Miguel','Ángel','Julio','Óscar','Gustavo','Derlis','Antonio','Braian','Cristian','Damián','Diego','Edgar','Fabián','Federico','Hernán','Hugo','Iván','Jorge','Juan','Lucas','Marcelo','Matías','Néstor','Pablo','Pedro','Ramón','Richard','Robert','Rodrigo','Rubén','Salvador','Santiago','Sergio','Víctor','Wilder','Alejandro','Carlos','Enrique','Fernando','Gonzalo'],
  'Canadá': ['Liam','Noah','William','Benjamin','Lucas','Jack','Owen','Ethan','Nathan','Jacob','Logan','Mason','Alexander','Carter','Daniel','Evan','Gabriel','Henry','Isaac','James','Jonathan','Joshua','Justin','Kevin','Leo','Miles','Nolan','Oliver','Ryan','Samuel','Thomas','Tyler','Adam','Andrew','Brandon','Cameron','Connor','Dylan','Eric','Matthew'],
  'Gana': ['Kwame','Kofi','Yaw','Kwesi','Kojo','Daniel','Samuel','Emmanuel','Michael','Mohammed','Abdul','Ibrahim','Joseph','John','Peter','David','Isaac','Joshua','Prince','Richmond','Salis','Thomas','Baba','Iddrisu','Mubarak','Osman','Rashid','Sulemana','Alhassan','Bernard','Christian','Elvis','Ernest','Felix','Gideon','Godfred','Jonathan','Kingsley','Majeed','Nana'],
  'Costa do Marfim': ['Ibrahim','Adama','Kouassi','Yao','Koffi','Serge','Didier','Yaya','Salomon','Wilfried','Nicolas','Franck','Seko','Simon','Amad','Christian','Emmanuel','Eric','Gervais','Hamed','Ismaël','Jean','Jonathan','Kader','Lassina','Max','Oumar','Patrick','Souleymane','Stéphane','Sylvain','Thierry','Vincent','Yann','Zoro','Abdoul','Bakary','Cheick','Dramane','Gaël'],
  'Camarões': ['Samuel','Roger','Vincent','André','Jean','Paul','Pierre','Joseph','Emmanuel','Eric','Georges','Alphonse','Boris','Cédric','Christian','Collins','Didier','François','Gaël','Hervé','Ignatius','Jacques','Karl','Léon','Marc','Martin','Michel','Nicolas','Olivier','Patrice','Ronald','Serge','Stéphane','Thierry','Thomas','Valentin','Xavier','Yannick','Yvan','Clinton'],
  'Arábia Saudita': ['Salem','Firas','Mohammed','Abdullah','Ali','Hassan','Omar','Yasser','Ahmed','Khaled','Saud','Nawaf','Sultan','Fahad','Majed','Nasser','Talal','Waleed','Ziyad','Hamad','Ibrahim','Jaber','Khalid','Mansour','Nasser','Rakan','Saeed','Samir','Tariq','Yousef','Adel','Bandar','Faisal','Hattan','Jamaan','Khalil','Meshari','Naif','Rashed','Turki'],
  'Catar': ['Akram','Almoez','Hassan','Mohammed','Abdullah','Ahmed','Ali','Khalid','Yousef','Salem','Jassim','Nasser','Saad','Tarek','Fahad','Hamad','Ibrahim','Ismail','Khaled','Majed','Mansour','Meshaal','Nayef','Omar','Rashid','Sultan','Waleed','Yasser','Zayed','Abdulaziz','Faisal','Hatem','Jassem','Khalifa','Murad','Nabil','Saeed','Samir','Talal','Yousef'],
  'Irã': ['Mehdi','Sardar','Alireza','Reza','Mahdi','Hossein','Amir','Mohammad','Ali','Hassan','Saeid','Kaveh','Karim','Milad','Morteza','Omid','Ramin','Saman','Vahid','Younes','Ahmad','Behnam','Ehsan','Farhad','Gholam','Hamid','Iman','Javad','Kian','Majid','Masoud','Navid','Payam','Rasoul','Shahin','Soheil','Taha','Vafa','Yaghoub','Zaman'],
  'Costa Rica': ['Keylor','Manfred','Joel','Francisco','Celso','Bryan','Oscar','Alonso','Carlos','Daniel','David','Erick','Esteban','Gerson','Giancarlo','Hernán','Ian','Johan','José','Juan','Kendall','Luis','Marcos','Mario','Michael','Néstor','Orlando','Pablo','Randall','Ricardo','Rodolfo','Rónald','Roy','Sergio','Steven','Tejeda','Ulises','Víctor','Walter','Yeltsin']
};

const LAST = {
  'default': ['Silva','Santos','Oliveira','Souza','Lima','Pereira','Costa','Ferreira','Rodrigues','Almeida','Nascimento','Carvalho','Gomes','Martins','Rocha','Ribeiro','Alves','Monteiro','Mendes','Barros','Freitas','Barbosa','Pinto','Moura','Cavalcanti','Dias','Castro','Campos','Cardoso','Azevedo','Teixeira','Moreira','Correia','Nunes','Machado','Farias','Vieira','Araújo','Fernandes','Gonçalves'],
  'Argentina': ['González','Rodríguez','Fernández','López','Martínez','Pérez','García','Sánchez','Romero','Sosa','Torres','Álvarez','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Herrera','Aguirre','Giménez','Molina','Silva','Ortiz','Rojas','Suárez','Cabrera','Vega','Luna','Paz','Quiroga','Cáceres','Ferreyra','Pereyra','Domínguez','Godoy','Ibarra','Coronel','Ledesma','Villalba'],
  'Inglaterra': ['Smith','Jones','Taylor','Brown','Williams','Wilson','Johnson','Davies','Robinson','Wright','Thompson','Evans','Walker','White','Roberts','Green','Hall','Wood','Jackson','Clarke','Turner','Hill','Harris','Cooper','King','Baker','Ward','Morris','Clark','Harrison','Foster','Bell','Gray','James','Hughes','Price','Morgan','Bailey','Parker','Brooks'],
  'Espanha': ['García','Rodríguez','González','Fernández','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Iglesias'],
  'França': ['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','Garcia','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Lefevre','Mercier','Dupont','Lambert','Bonnet','François','Martinez','Legrand','Garnier','Faure','Rousseau','Blanc','Guerin','Muller','Henry','Roussel','Nicolas'],
  'Itália': ['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini','Costa','Giordano','Rizzo','Lombardi','Moretti','Barbieri','Fontana','Santoro','Mariani','Rinaldi','Caruso','Ferrara','Galli','Martini','Leone','Longo','Gentile','Martinelli','Vitale','Serra','Coppola','De Santis','D\'Angelo','Marchetti','Parisi'],
  'Alemanha': ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier','Lehmann','Schmid','Schulze','Maier','Köhler','Herrmann','König','Walter','Mayer','Huber'],
  'Holanda': ['de Jong','Jansen','de Vries','van den Berg','van Dijk','Bakker','Janssen','Visser','Smit','Meijer','de Boer','Mulder','de Groot','Bos','Vos','Peters','Hendriks','van Leeuwen','Dekker','Brouwer','de Wit','Dijkstra','Smits','de Graaf','van der Meer','Kok','Jacobs','Vermeulen','van der Linden','van den Heuvel','Willems','van der Veen','van den Broek','van der Wal','de Bruijn','de Bruin','van der Heijden','van der Berg','Schouten','van Beek'],
  'Portugal': ['Silva','Santos','Ferreira','Pereira','Oliveira','Costa','Rodrigues','Martins','Jesus','Sousa','Fernandes','Gonçalves','Gomes','Lopes','Marques','Alves','Almeida','Ribeiro','Pinto','Carvalho','Teixeira','Moreira','Correia','Mendes','Nunes','Soares','Vieira','Monteiro','Cardoso','Rocha','Neves','Coelho','Cruz','Cunha','Pires','Ramos','Reis','Simões','Antunes','Matos'],
  'Japão': ['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Yamazaki','Mori','Abe','Ikeda','Hashimoto','Ishikawa','Ogawa','Goto','Okada','Hasegawa','Murakami','Kondo','Ishii','Saito','Sakamoto','Endo','Aoki','Fujita','Ohara','Nishimura','Fukuda'],
  'Coreia do Sul': ['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh','Seo','Shin','Kwon','Hwang','Ahn','Song','Yoo','Hong','Jeon','Ko','Moon','Son','Baek','Yang','Nam','Sim','Ryu','Noh','Ha','Koo','Cha','Joo','Woo','Gu','Min','Bae','Jin','Ma'],
  'Marrocos': ['El Amrani','Alaoui','Bennani','Cherkaoui','El Idrissi','Benjelloun','Tazi','Berrada','Sekkat','Fassi','Lahlou','Chraibi','Bouzid','Haddad','Naciri','Ouazzani','Rahmani','Saidi','Tahiri','Zeroual','Ait Ali','Bouazza','El Fassi','Hajji','Kabbaj','Mansouri','Naji','Ouali','Rifi','Sabri','Taleb','Yahyaoui','Ziani','Amrani','Bennis','Daoudi','El Ghazi','Fikri','Guerraoui','Hamdi'],
  'Senegal': ['Diop','Ndiaye','Fall','Sow','Ba','Gueye','Sarr','Diallo','Cissé','Faye','Mbaye','Seck','Thiam','Touré','Kane','Camara','Coly','Diatta','Diedhiou','Dieng','Diouf','Drame','Gomis','Hane','Kébé','Konaté','Lopy','Mendy','Niang','Ndiour','Sagna','Sané','Sidibé','Sonko','Sy','Tall','Thiaw','Tine','Traoré','Wade'],
  'Nigéria': ['Okafor','Adeyemi','Okoye','Eze','Obi','Uche','Nwosu','Ogunleye','Bello','Abubakar','Adesanya','Akande','Akinola','Balogun','Chukwu','Dike','Ekwueme','Fashola','Ibe','Ibrahim','Jideofor','Kalu','Lawal','Mba','Nnamdi','Nwachukwu','Obiora','Obi','Ojo','Okonkwo','Olawale','Onyeka','Opara','Osaze','Oyeleke','Salami','Sule','Uba','Yakubu','Yusuf'],
  'Egito': ['Hassan','Mahmoud','Ibrahim','Mohamed','Ali','Ahmed','Mostafa','Youssef','Said','Abdelrahman','El-Sayed','Fathy','Gaber','Hany','Ismail','Kamal','Lotfy','Mansour','Nasser','Omar','Rashad','Sabry','Taha','Wahba','Yassin','Zaki','Abdelaziz','Barakat','Darwish','Ezz','Farouk','Ghoneim','Hamdy','Khalil','Magdy','Nabil','Othman','Ragab','Shaaban','Soliman'],
  'default2': ['Martins','Silva','Costa','Pereira','Souza','Oliveira','Santos','Ferreira','Almeida','Lima','Gomes','Ribeiro','Carvalho','Rocha','Nascimento','Alves','Mendes','Monteiro','Barbosa','Freitas','Pinto','Moura','Dias','Castro','Campos','Cardoso','Azevedo','Teixeira','Moreira','Correia','Nunes','Machado','Farias','Vieira','Araújo','Fernandes','Gonçalves','Rodrigues','Martins','Lopes']
};

const HAIR = ['#1b1410','#2a1d14','#3d2a1c','#4e3826','#6b4a2c','#8a633d','#c49a6c','#d8b48a','#e8d2ad','#2b2b2b','#111111','#7a4a2a'];
const SKIN = ['#f2c9a5','#e8b58c','#dba173','#c98b5e','#b07148','#8f5435','#6d3d27','#f5d6b8','#e3ac82','#a5633c'];
const CREST_SYMBOLS = ['★','✦','◆','♜','⚑','▲','●','✹','⬟','⌂','♠','♣','⚡','☾','✚','⬢','◈','☘'];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();

function fallbackColors(name, league) {
  const h = hash(name);
  const palette = [
    ['#c8102e','#f4f4f4'], ['#1c3f94','#f4f4f4'], ['#1b7f3f','#f4f4f4'], ['#f0c22a','#111111'],
    ['#7a1f3d','#8ecae6'], ['#111111','#f4f4f4'], ['#ff7b3c','#1c3f94'], ['#6b2c91','#f4f4f4'],
    ['#1c9bd6','#f4f4f4'], ['#8ecae6','#7a1f3d'], ['#f4f4f4','#1c3f94'], ['#1b7f3f','#f0c22a']
  ];
  const p = palette[h % palette.length];
  return [p[0], p[1], league?.color || '#c8ff3d'];
}

function buildPlayerName(country, r) {
  const firsts = FIRST[country] || FIRST['Brasil'];
  const lasts = LAST[country] || LAST.default;
  return `${pick(r, firsts)} ${pick(r, lasts)}`;
}

function attrsFor(pos, rating, r) {
  const v = (base, spread = 6) => Math.max(40, Math.min(99, Math.round(base + (r() - .5) * spread)));
  const map = {
    GOL: { pace: rating - 8, shoot: 35, pass: rating - 10, dribble: rating - 18, defense: rating + 2, physical: rating + 1 },
    ZAG: { pace: rating - 7, shoot: rating - 22, pass: rating - 8, dribble: rating - 14, defense: rating + 4, physical: rating + 5 },
    LAT: { pace: rating + 3, shoot: rating - 10, pass: rating - 1, dribble: rating + 1, defense: rating + 1, physical: rating - 1 },
    VOL: { pace: rating - 1, shoot: rating - 9, pass: rating + 2, dribble: rating - 2, defense: rating + 4, physical: rating + 3 },
    MEI: { pace: rating - 1, shoot: rating - 2, pass: rating + 4, dribble: rating + 3, defense: rating - 7, physical: rating - 3 },
    PON: { pace: rating + 6, shoot: rating - 1, pass: rating, dribble: rating + 5, defense: rating - 12, physical: rating - 5 },
    ATA: { pace: rating + 3, shoot: rating + 5, pass: rating - 3, dribble: rating + 2, defense: rating - 15, physical: rating + 1 }
  };
  const b = map[pos] || map.MEI;
  return {
    pace: v(b.pace, 9), shoot: v(b.shoot, 10), pass: v(b.pass, 8), dribble: v(b.dribble, 10),
    defense: v(b.defense, 9), physical: v(b.physical, 8), stamina: v(70 + (rating - 70) * 1.2, 12)
  };
}

function valueFor(rating, age) {
  const base = Math.pow(Math.max(1, rating - 50), 2) * .026;
  const ageFactor = age < 22 ? 1.45 : age < 26 ? 1.25 : age < 30 ? 1 : age < 33 ? .55 : .22;
  return Math.max(150, Math.round(base * ageFactor) * 1000);
}

let playerSeq = 0;
function makePlayer(team, pos, rating, r, num, customName) {
  const age = 18 + Math.floor(r() * 19);
  const a = attrsFor(pos, rating, r);
  const name = customName || buildPlayerName(team.country, r);
  const nationality = team.country;
  const foot = r() < .72 ? 'Direito' : 'Esquerdo';
  return {
    id: `p${++playerSeq}`, name, short: name.split(' ').slice(-1)[0], teamId: team.id, pos, num,
    rating, ...a, age, nationality, foot,
    form: 70 + Math.floor(r() * 26), morale: 65 + Math.floor(r() * 31),
    value: valueFor(rating, age), wage: Math.max(2, Math.round(valueFor(rating, age) / 160000)),
    injured: 0, card: 0, skin: pick(r, SKIN), hair: pick(r, HAIR), hairStyle: Math.floor(r() * 4),
    boots: r() < .5 ? '#f4f4f4' : r() < .5 ? '#111111' : '#c8ff3d'
  };
}

function buildTeam(raw, league, index) {
  const [name, city, rating] = raw;
  const id = `${league.id}-${slug(name)}`;
  const kit = KIT[name] || fallbackColors(name, league);
  const h = hash(name);
  const crestShape = h % 3 === 0 ? 'square' : h % 3 === 1 ? 'round' : '';
  const [stadium, capacity] = STADIUM_OVERRIDE[name] || [`${city} Arena`, 18000 + (h % 45000)];
  const team = {
    id, name, short: name.length > 16 ? name.slice(0, 14) + '.' : name,
    abbr: (name.replace(/[^A-Za-zÀ-ÿ ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3) || name.slice(0, 3)).toUpperCase(),
    city, country: league.country, leagueId: league.id, confed: league.confed, rating,
    colors: { primary: kit[0], secondary: kit[1], accent: kit[2] || kit[0], shorts: kit[1], socks: kit[0] },
    crest: { bg: kit[0], fg: kit[2] || kit[1], symbol: CREST_SYMBOLS[h % CREST_SYMBOLS.length], shape: crestShape },
    stadium: { name: stadium, city, capacity, roof: true },
    isNational: false, formation: ['4-3-3','4-2-3-1','4-4-2','4-1-4-1','3-5-2'][h % 5],
    mentality: ['equilibrada','ofensiva','equilibrada','defensiva'][h % 4],
    squad: [], transferBudget: Math.round(rating * rating * 26000)
  };
  const r = rng(h);
  const stars = (STAR_MAP[name] || []).slice();
  const starPos = new Set(stars.map(s => s[1]));
  const sequence = [
    ['GOL', 1], ['ZAG', 4], ['ZAG', 5], ['LAT', 2], ['LAT', 6], ['VOL', 8], ['VOL', 5], ['MEI', 10],
    ['MEI', 8], ['PON', 7], ['PON', 11], ['ATA', 9], ['GOL', 12], ['ZAG', 13], ['ZAG', 14], ['LAT', 15],
    ['VOL', 16], ['MEI', 17], ['PON', 18], ['ATA', 19], ['ATA', 20], ['MEI', 21]
  ];
  const usedStars = new Set();
  for (let i = 0; i < sequence.length; i++) {
    const [pos, num] = sequence[i];
    let star = stars.find(s => !usedStars.has(s[0]) && s[1] === pos && i < 11);
    let rating2 = Math.max(52, Math.min(94, Math.round(rating + (i < 11 ? 0 : -5) + (r() - .5) * 8)));
    if (star) { usedStars.add(star[0]); rating2 = star[2]; }
    const p = makePlayer(team, pos, rating2, r, num, star ? star[0] : null);
    team.squad.push(p);
  }
  const remainingStars = stars.filter(s => !usedStars.has(s[0]));
  for (const s of remainingStars) {
    const p = makePlayer(team, s[1], s[2], r, 22 + team.squad.length, s[0]);
    team.squad.push(p);
  }
  return team;
}

export const LEAGUES = LEAGUE_DATA.map(l => ({
  ...l, type: 'league', logo: l.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}));

const teamMap = {};
for (const league of LEAGUES) {
  league.teams = league.teams.map((raw, i) => {
    const t = buildTeam(raw, league, i);
    teamMap[t.id] = t;
    return t;
  });
}

export const NATIONAL_LEAGUE = {
  id: 'selecoes', name: 'Seleções Nacionais', country: 'Mundo', confed: 'FIFA', type: 'national', color: '#ffd84a', logo: 'FIFA',
  teams: []
};
for (const [name, country, confed, rating, c1, c2] of NATIONAL_DATA) {
  const id = `selecoes-${slug(name)}`;
  const h = hash(name);
  const team = {
    id, name, short: name, abbr: name.slice(0, 3).toUpperCase(), city: 'Seleção', country: name,
    leagueId: 'selecoes', confed, rating, isNational: true,
    colors: { primary: c1, secondary: c2, accent: c2, shorts: c2, socks: c1 },
    crest: { bg: c1, fg: c2, symbol: '★', shape: 'round' },
    stadium: { name: `Estádio Nacional ${name}`, city: 'Capital', capacity: 45000 + h % 35000, roof: true },
    formation: ['4-3-3','4-2-3-1','4-4-2'][h % 3], mentality: 'equilibrada',
    squad: [], transferBudget: 0
  };
  const r = rng(h);
  const stars = NATIONAL_STARS[name] || [];
  const used = new Set();
  const seq = [['GOL',1],['ZAG',4],['ZAG',5],['LAT',2],['LAT',6],['VOL',8],['VOL',5],['MEI',10],['MEI',8],['PON',7],['PON',11],['ATA',9],['GOL',12],['ZAG',13],['MEI',14],['PON',15],['ATA',16],['VOL',17],['LAT',18],['MEI',19],['ATA',20],['ZAG',21]];
  for (let i = 0; i < seq.length; i++) {
    const [pos, num] = seq[i];
    let star = stars.find(s => !used.has(s[0]) && s[1] === pos && i < 11);
    let rating2 = Math.round(rating + (i < 11 ? 0 : -4) + (r() - .5) * 7);
    if (star) { used.add(star[0]); rating2 = star[2]; }
    team.squad.push(makePlayer(team, pos, Math.max(55, Math.min(95, rating2)), r, num, star ? star[0] : null));
  }
  for (const s of stars.filter(s => !used.has(s[0]))) team.squad.push(makePlayer(team, s[1], s[2], r, 22 + team.squad.length, s[0]));
  teamMap[id] = team;
  NATIONAL_LEAGUE.teams.push(team);
}

export const TEAMS = teamMap;
export const ALL_TEAMS = [...LEAGUES.flatMap(l => l.teams), ...NATIONAL_LEAGUE.teams];
export const ALL_PLAYERS = ALL_TEAMS.flatMap(t => t.squad);

export function getTeam(id) { return TEAMS[id] || null; }
export function getLeague(id) { return LEAGUES.find(l => l.id === id) || (id === 'selecoes' ? NATIONAL_LEAGUE : null); }
export function leaguesWithTeams() { return [...LEAGUES, NATIONAL_LEAGUE]; }
export function teamsByLeague(leagueId) { return getLeague(leagueId)?.teams || []; }
export function squadFor(id) { return (TEAMS[id] || { squad: [] }).squad; }
export function defaultLineup(team) {
  const formation = FORMATIONS[team.formation] || FORMATIONS['4-3-3'];
  const used = new Set();
  return formation.slots.map(([pos], i) => {
    let p = team.squad.find(x => x.pos === pos && !used.has(x.id));
    if (!p) p = team.squad.find(x => !used.has(x.id));
    if (p) used.add(p.id);
    return p ? p.id : null;
  }).filter(Boolean);
}
export function benchFor(team, lineup) {
  const set = new Set(lineup || defaultLineup(team));
  return team.squad.filter(p => !set.has(p.id)).slice(0, 9);
}
export function overallForSquad(team) {
  const lineup = defaultLineup(team).map(id => team.squad.find(p => p.id === id)).filter(Boolean);
  if (!lineup.length) return team.rating;
  return Math.round(lineup.reduce((a, p) => a + p.rating, 0) / lineup.length);
}
export function playerById(id) { return ALL_PLAYERS.find(p => p.id === id) || null; }
export function playerValueLabel(v) {
  if (v >= 1000000) return `€${(v / 1000000).toFixed(1).replace('.', ',')}M`;
  return `€${Math.round(v / 1000)}K`;
}
export function teamInitials(name) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

function poolByIds(ids) { return [...new Set(ids)].map(id => TEAMS[id]).filter(Boolean); }

const europeanTop = ['premier','laliga','seriea','bundesliga','ligue1','primeira','eredivisie'].flatMap(id => {
  const l = LEAGUES.find(x => x.id === id);
  return l.teams.slice(0, id === 'premier' || id === 'laliga' || id === 'seriea' ? 5 : 4).map(t => t.id);
});
const southAmericanTop = [
  ...LEAGUES.find(x => x.id === 'brasileirao').teams.slice(0, 8).map(t => t.id),
  ...LEAGUES.find(x => x.id === 'argentina').teams.slice(0, 6).map(t => t.id),
  ...LEAGUES.find(x => x.id === 'sudamericana').teams.map(t => t.id)
];

export const COMPETITIONS = [
  ...LEAGUES.map(l => ({
    id: l.id, name: l.name, short: l.name.replace('Série A', 'Série A').replace('EA Sports', '').trim(),
    country: l.country, confed: l.confed, type: 'league', format: 'Pontos corridos',
    teams: l.teams.map(t => t.id), color: l.color, icon: l.id === 'brasileirao' ? '🇧🇷' : l.id === 'premier' ? '🏴' : l.id === 'laliga' ? '🇪🇸' : l.id === 'seriea' ? '🇮🇹' : l.id === 'bundesliga' ? '🇩🇪' : l.id === 'ligue1' ? '🇫🇷' : '🏆',
    prize: 1200
  })),
  { id: 'libertadores', name: 'CONMEBOL Libertadores', short: 'Libertadores', country: 'América do Sul', confed: 'CONMEBOL', type: 'cup', format: 'Grupos + mata-mata', teams: poolByIds(southAmericanTop).map(t => t.id), color: '#c8ff3d', icon: '🏆', prize: 3000, groupStage: true },
  { id: 'champions', name: 'UEFA Champions League', short: 'Champions League', country: 'Europa', confed: 'UEFA', type: 'cup', format: 'Grupos + mata-mata', teams: poolByIds(europeanTop).map(t => t.id), color: '#54a8ff', icon: '⭐', prize: 3500, groupStage: true },
  { id: 'copadobrasil', name: 'Copa do Brasil', short: 'Copa do Brasil', country: 'Brasil', confed: 'CBF', type: 'cup', format: 'Mata-mata', teams: LEAGUES.find(l => l.id === 'brasileirao').teams.map(t => t.id), color: '#ffd84a', icon: '🇧🇷', prize: 2200 },
  { id: 'mundial', name: 'Copa do Mundo FIFA', short: 'Copa do Mundo', country: 'Mundo', confed: 'FIFA', type: 'cup', format: 'Grupos + mata-mata', teams: NATIONAL_LEAGUE.teams.slice(0, 32).map(t => t.id), color: '#ffd84a', icon: '🌍', prize: 5000, groupStage: true },
  { id: 'copaamerica', name: 'CONMEBOL Copa América', short: 'Copa América', country: 'América do Sul', confed: 'CONMEBOL', type: 'cup', format: 'Grupos + mata-mata', teams: NATIONAL_LEAGUE.teams.filter(t => t.confed === 'CONMEBOL').map(t => t.id), color: '#36e5c0', icon: '🏅', prize: 2600, groupStage: true },
  { id: 'euro', name: 'UEFA Euro', short: 'Euro', country: 'Europa', confed: 'UEFA', type: 'cup', format: 'Grupos + mata-mata', teams: NATIONAL_LEAGUE.teams.filter(t => t.confed === 'UEFA').map(t => t.id), color: '#ff7b3c', icon: '🏆', prize: 2800, groupStage: true },
  { id: 'recopa', name: 'Recopa Sul-Americana', short: 'Recopa', country: 'América do Sul', confed: 'CONMEBOL', type: 'cup', format: 'Final única', teams: poolByIds(southAmericanTop.slice(0, 8)).map(t => t.id), color: '#ffd84a', icon: '🏆', prize: 900 },
  { id: 'supercopa', name: 'Supercopa PES', short: 'Supercopa', country: 'Mundo', confed: 'FIFA', type: 'cup', format: 'Mata-mata 16', teams: [...europeanTop.slice(0, 8), ...southAmericanTop.slice(0, 8)].map(id => id), color: '#ba8cff', icon: '⚡', prize: 1600 }
];

export function getCompetition(id) { return COMPETITIONS.find(c => c.id === id) || null; }
export function compTeams(comp) {
  if (!comp) return [];
  return comp.teams.map(id => TEAMS[id]).filter(Boolean);
}
export function teamRating(team) { return overallForSquad(team); }
export function teamName(id) { return TEAMS[id]?.name || 'Time'; }
export function compById(id) { return getCompetition(id); }

export const LEGEND_CLUBS = ['brasileirao-flamengo','premier-liverpool','laliga-real-madrid','seriea-milan','bundesliga-bayern-de-munique','ligue1-psg','argentina-river-plate','saudita-al-nassr'];

export const PAIRS = [['transmissao','Dinâmica','Aérea','Clássica'], []];
export const HERO_NEWS = [
  'Libertadores 2027 começa com clássico brasileiro na fase de grupos',
  'Mercado: craque de 19 anos é disputado por três gigantes europeus',
  'Master League: nova janela de transferências movimenta o futebol mundial',
  'Rumo ao Estrelato: seu atacante pode ser o próximo Bola de Ouro',
  'Champions League: sorteio define grupos da morte para a nova temporada',
  'Brasileirão: rodada decisiva promete fortes emoções no fim de semana'
];

export function generateFixtures(teamIds, doubleRound = false) {
  const teams = [...teamIds];
  if (teams.length % 2) teams.push('BYE');
  const n = teams.length;
  const rounds = [];
  const half = n / 2;
  let arr = [...teams];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i], b = arr[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') round.push({ home: r % 2 ? b : a, away: r % 2 ? a : b });
    }
    rounds.push(round);
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  if (doubleRound) {
    const second = rounds.map(r => r.map(m => ({ home: m.away, away: m.home })));
    return [...rounds, ...second];
  }
  return rounds;
}

export function formatMoney(v) { return playerValueLabel(v); }
export function formatDate(dayIndex) {
  const d = new Date(2027, 0, 9 + dayIndex * 4);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
}
export function nextMatchDate(round) { return formatDate(round * 1.5); }

export function findPlayerNameLike(q) {
  const term = q.toLowerCase();
  return ALL_PLAYERS.filter(p => p.name.toLowerCase().includes(term)).slice(0, 30);
}
