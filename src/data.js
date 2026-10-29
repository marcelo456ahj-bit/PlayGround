const TEAM_ROWS = {
  brasileirao: [
    ["fla", "Flamengo", "FLA", "Rio de Janeiro", "#c8102e", "#141414", "#ffffff", 87, "Maracanã"],
    ["pal", "Palmeiras", "PAL", "São Paulo", "#006b3f", "#f4f4f4", "#ffffff", 86, "Allianz Parque"],
    ["cor", "Corinthians", "COR", "São Paulo", "#ececec", "#121212", "#ffffff", 83, "Neo Química Arena"],
    ["sao", "São Paulo", "SAO", "São Paulo", "#d71920", "#111111", "#ffffff", 82, "Morumbi"],
    ["flu", "Fluminense", "FLU", "Rio de Janeiro", "#7a1c2e", "#1a7a4a", "#ffffff", 81, "Maracanã"],
    ["bot", "Botafogo", "BOT", "Rio de Janeiro", "#111111", "#f5f5f5", "#ffffff", 84, "Nilton Santos"],
    ["vas", "Vasco da Gama", "VAS", "Rio de Janeiro", "#111111", "#f5f5f5", "#ffffff", 79, "São Januário"],
    ["gre", "Grêmio", "GRE", "Porto Alegre", "#2f7fc1", "#111111", "#ffffff", 80, "Arena do Grêmio"],
    ["int", "Internacional", "INT", "Porto Alegre", "#c8102e", "#f5f5f5", "#ffffff", 81, "Beira-Rio"],
    ["cru", "Cruzeiro", "CRU", "Belo Horizonte", "#1e4d9b", "#f5f5f5", "#ffffff", 80, "Mineirão"],
    ["cam", "Atlético-MG", "CAM", "Belo Horizonte", "#111111", "#f5f5f5", "#ffffff", 83, "Arena MRV"],
    ["bah", "Bahia", "BAH", "Salvador", "#1e4d9b", "#d71920", "#ffffff", 78, "Arena Fonte Nova"],
    ["for", "Fortaleza", "FOR", "Fortaleza", "#1e4d9b", "#d71920", "#ffffff", 78, "Arena Castelão"],
    ["cap", "Athletico-PR", "CAP", "Curitiba", "#c8102e", "#111111", "#ffffff", 77, "Ligga Arena"],
    ["san", "Santos", "SAN", "Santos", "#f5f5f5", "#111111", "#ffffff", 76, "Vila Belmiro"],
    ["rbb", "Red Bull Bragantino", "RBB", "Bragança Paulista", "#f5f5f5", "#d71920", "#ffffff", 77, "Nabi Abi Chedid"]
  ],
  premier: [
    ["ars", "Arsenal", "ARS", "Londres", "#d71920", "#f5f5f5", "#ffffff", 87, "Emirates Stadium"],
    ["liv", "Liverpool", "LIV", "Liverpool", "#c8102e", "#00a398", "#ffffff", 88, "Anfield"],
    ["mci", "Manchester City", "MCI", "Manchester", "#6cabdd", "#1c2c5b", "#ffffff", 89, "Etihad Stadium"],
    ["mun", "Manchester United", "MUN", "Manchester", "#d71920", "#f5f5f5", "#ffffff", 82, "Old Trafford"],
    ["che", "Chelsea", "CHE", "Londres", "#1e4d9b", "#f5f5f5", "#ffffff", 84, "Stamford Bridge"],
    ["tot", "Tottenham", "TOT", "Londres", "#f5f5f5", "#1c2c5b", "#ffffff", 83, "Tottenham Hotspur"],
    ["new", "Newcastle", "NEW", "Newcastle", "#111111", "#f5f5f5", "#ffffff", 81, "St. James' Park"],
    ["avl", "Aston Villa", "AVL", "Birmingham", "#7a1c2e", "#6cabdd", "#ffffff", 80, "Villa Park"],
    ["bha", "Brighton", "BHA", "Brighton", "#1e4d9b", "#f5f5f5", "#ffffff", 78, "Amex Stadium"],
    ["whu", "West Ham", "WHU", "Londres", "#7a1c2e", "#6cabdd", "#ffffff", 77, "London Stadium"],
    ["eve", "Everton", "EVE", "Liverpool", "#1e4d9b", "#f5f5f5", "#ffffff", 75, "Goodison Park"],
    ["nfo", "Nottingham Forest", "NFO", "Nottingham", "#d71920", "#f5f5f5", "#ffffff", 76, "City Ground"]
  ],
  laliga: [
    ["rma", "Real Madrid", "RMA", "Madri", "#f5f5f5", "#d4af37", "#1c2c5b", 90, "Santiago Bernabéu"],
    ["bar", "Barcelona", "BAR", "Barcelona", "#1e4d9b", "#7a1c2e", "#f4d03f", 89, "Camp Nou"],
    ["atm", "Atlético de Madrid", "ATM", "Madri", "#d71920", "#f5f5f5", "#1c2c5b", 85, "Metropolitano"],
    ["sev", "Sevilla", "SEV", "Sevilha", "#f5f5f5", "#d71920", "#ffffff", 79, "Ramón Sánchez-Pizjuán"],
    ["rso", "Real Sociedad", "RSO", "San Sebastián", "#1e4d9b", "#f5f5f5", "#ffffff", 80, "Reale Arena"],
    ["ath", "Athletic Club", "ATH", "Bilbao", "#d71920", "#f5f5f5", "#ffffff", 81, "San Mamés"],
    ["vil", "Villarreal", "VIL", "Villarreal", "#f4d03f", "#1e4d9b", "#ffffff", 80, "La Cerámica"],
    ["bet", "Real Betis", "BET", "Sevilha", "#1a7a4a", "#f5f5f5", "#ffffff", 78, "Benito Villamarín"],
    ["val", "Valencia", "VAL", "Valência", "#f5f5f5", "#111111", "#ffffff", 77, "Mestalla"],
    ["gir", "Girona", "GIR", "Girona", "#d71920", "#f5f5f5", "#ffffff", 76, "Montilivi"],
    ["cel", "Celta de Vigo", "CEL", "Vigo", "#6cabdd", "#f5f5f5", "#ffffff", 74, "Balaídos"],
    ["mll", "Mallorca", "MLL", "Palma", "#d71920", "#111111", "#ffffff", 73, "Son Moix"]
  ],
  seriea: [
    ["int", "Internazionale", "INT", "Milão", "#1e4d9b", "#111111", "#ffffff", 87, "San Siro"],
    ["mil", "Milan", "MIL", "Milão", "#c8102e", "#111111", "#ffffff", 85, "San Siro"],
    ["juv", "Juventus", "JUV", "Turim", "#f5f5f5", "#111111", "#ffffff", 84, "Allianz Stadium"],
    ["nap", "Napoli", "NAP", "Nápoles", "#6cabdd", "#f5f5f5", "#ffffff", 86, "Diego Maradona"],
    ["rom", "Roma", "ROM", "Roma", "#7a1c2e", "#f4a300", "#ffffff", 81, "Olímpico"],
    ["laz", "Lazio", "LAZ", "Roma", "#6cabdd", "#f5f5f5", "#ffffff", 80, "Olímpico"],
    ["ata", "Atalanta", "ATA", "Bérgamo", "#111111", "#1e4d9b", "#ffffff", 82, "Gewiss Stadium"],
    ["fio", "Fiorentina", "FIO", "Florença", "#6b2d8f", "#f5f5f5", "#ffffff", 79, "Artemio Franchi"],
    ["bol", "Bologna", "BOL", "Bolonha", "#c8102e", "#1e4d9b", "#ffffff", 78, "Renato Dall'Ara"],
    ["tor", "Torino", "TOR", "Turim", "#7a1c2e", "#f5f5f5", "#ffffff", 75, "Olímpico Grande Torino"],
    ["gen", "Genoa", "GEN", "Gênova", "#7a1c2e", "#1e4d9b", "#ffffff", 74, "Luigi Ferraris"],
    ["udi", "Udinese", "UDI", "Udine", "#111111", "#f5f5f5", "#ffffff", 74, "Dacia Arena"]
  ],
  bundesliga: [
    ["bay", "Bayern de Munique", "BAY", "Munique", "#d71920", "#f5f5f5", "#ffffff", 89, "Allianz Arena"],
    ["bvb", "Borussia Dortmund", "BVB", "Dortmund", "#f4d03f", "#111111", "#ffffff", 84, "Signal Iduna Park"],
    ["b04", "Bayer Leverkusen", "B04", "Leverkusen", "#d71920", "#111111", "#ffffff", 85, "BayArena"],
    ["rbl", "RB Leipzig", "RBL", "Leipzig", "#f5f5f5", "#d71920", "#ffffff", 83, "Red Bull Arena"],
    ["sge", "Eintracht Frankfurt", "SGE", "Frankfurt", "#111111", "#d71920", "#ffffff", 80, "Deutsche Bank Park"],
    ["vfb", "VfB Stuttgart", "VFB", "Stuttgart", "#f5f5f5", "#d71920", "#ffffff", 79, "MHPArena"],
    ["wol", "Wolfsburg", "WOL", "Wolfsburg", "#1a7a4a", "#f5f5f5", "#ffffff", 76, "Volkswagen Arena"],
    ["bmg", "Borussia M'gladbach", "BMG", "Mönchengladbach", "#111111", "#1a7a4a", "#ffffff", 75, "Borussia-Park"],
    ["scf", "Freiburg", "SCF", "Freiburg", "#d71920", "#111111", "#ffffff", 75, "Europa-Park"],
    ["fcu", "Union Berlin", "FCU", "Berlim", "#d71920", "#f5f5f5", "#ffffff", 74, "Alte Försterei"]
  ],
  ligue1: [
    ["psg", "Paris Saint-Germain", "PSG", "Paris", "#1c2c5b", "#d71920", "#ffffff", 88, "Parc des Princes"],
    ["om", "Olympique de Marseille", "OM", "Marselha", "#6cabdd", "#f5f5f5", "#ffffff", 81, "Vélodrome"],
    ["asm", "Monaco", "ASM", "Monaco", "#d71920", "#f5f5f5", "#ffffff", 80, "Louis II"],
    ["ol", "Olympique Lyonnais", "OL", "Lyon", "#f5f5f5", "#1e4d9b", "#ffffff", 78, "Groupama Stadium"],
    ["lil", "Lille", "LIL", "Lille", "#d71920", "#1c2c5b", "#ffffff", 78, "Pierre-Mauroy"],
    ["nic", "Nice", "NIC", "Nice", "#111111", "#d71920", "#ffffff", 76, "Allianz Riviera"],
    ["len", "Lens", "LEN", "Lens", "#f4d03f", "#d71920", "#ffffff", 77, "Bollaert-Delelis"],
    ["ren", "Rennes", "REN", "Rennes", "#d71920", "#111111", "#ffffff", 76, "Roazhon Park"],
    ["nan", "Nantes", "NAN", "Nantes", "#f4d03f", "#1a7a4a", "#ffffff", 73, "La Beaujoire"],
    ["str", "Strasbourg", "STR", "Estrasburgo", "#6cabdd", "#f5f5f5", "#ffffff", 73, "Meinau"]
  ],
  libertadores: [
    ["boc", "Boca Juniors", "BOC", "Buenos Aires", "#1e4d9b", "#f4d03f", "#ffffff", 82, "La Bombonera"],
    ["riv", "River Plate", "RIV", "Buenos Aires", "#f5f5f5", "#d71920", "#111111", 84, "Monumental"],
    ["rac", "Racing", "RAC", "Avellaneda", "#6cabdd", "#f5f5f5", "#ffffff", 78, "El Cilindro"],
    ["ind", "Independiente", "IND", "Avellaneda", "#d71920", "#f5f5f5", "#ffffff", 77, "Libertadores de América"],
    ["pen", "Peñarol", "PEN", "Montevidéu", "#f4d03f", "#111111", "#ffffff", 78, "Campeón del Siglo"],
    ["nac", "Nacional", "NAC", "Montevidéu", "#f5f5f5", "#1e4d9b", "#ffffff", 77, "Gran Parque Central"],
    ["col", "Colo-Colo", "COL", "Santiago", "#f5f5f5", "#111111", "#ffffff", 76, "Monumental David Arellano"],
    ["uc", "Universidad Católica", "UC", "Santiago", "#1e4d9b", "#f5f5f5", "#ffffff", 75, "San Carlos de Apoquindo"],
    ["oli", "Olimpia", "OLI", "Assunção", "#f5f5f5", "#111111", "#ffffff", 76, "Defensores del Chaco"],
    ["cer", "Cerro Porteño", "CER", "Assunção", "#d71920", "#1e4d9b", "#ffffff", 76, "La Nueva Olla"],
    ["ldu", "LDU Quito", "LDU", "Quito", "#f5f5f5", "#d71920", "#ffffff", 75, "Rodrigo Paz Delgado"],
    ["idv", "Independiente del Valle", "IDV", "Sangolquí", "#111111", "#1a7a4a", "#ffffff", 75, "Banco Guayaquil"],
    ["nal", "Atlético Nacional", "AN", "Medellín", "#1a7a4a", "#f5f5f5", "#ffffff", 77, "Atanasio Girardot"],
    ["mil", "Millonarios", "MIL", "Bogotá", "#1e4d9b", "#f5f5f5", "#ffffff", 74, "El Campín"],
    ["ali", "Alianza Lima", "ALI", "Lima", "#1e4d9b", "#f5f5f5", "#ffffff", 73, "Matute"],
    ["cri", "Sporting Cristal", "CRI", "Lima", "#6cabdd", "#f5f5f5", "#ffffff", 73, "Alberto Gallardo"]
  ],
  mundo: [
    ["ben", "Benfica", "BEN", "Lisboa", "#d71920", "#f5f5f5", "#ffffff", 80, "Estádio da Luz"],
    ["por", "Porto", "POR", "Porto", "#1e4d9b", "#f5f5f5", "#ffffff", 81, "Dragão"],
    ["spo", "Sporting CP", "SCP", "Lisboa", "#1a7a4a", "#f5f5f5", "#ffffff", 81, "José Alvalade"],
    ["aja", "Ajax", "AJA", "Amsterdã", "#d71920", "#f5f5f5", "#ffffff", 78, "Johan Cruyff"],
    ["psv", "PSV", "PSV", "Eindhoven", "#d71920", "#f5f5f5", "#ffffff", 79, "Philips Stadion"],
    ["fey", "Feyenoord", "FEY", "Roterdã", "#d71920", "#f5f5f5", "#ffffff", 78, "De Kuip"],
    ["cel", "Celtic", "CEL", "Glasgow", "#1a7a4a", "#f5f5f5", "#ffffff", 76, "Celtic Park"],
    ["ran", "Rangers", "RAN", "Glasgow", "#1e4d9b", "#f5f5f5", "#ffffff", 75, "Ibrox"],
    ["gal", "Galatasaray", "GAL", "Istambul", "#d71920", "#f4d03f", "#ffffff", 79, "Rams Park"],
    ["fen", "Fenerbahçe", "FEN", "Istambul", "#f4d03f", "#1c2c5b", "#ffffff", 79, "Şükrü Saracoğlu"],
    ["shk", "Shakhtar", "SHK", "Donetsk", "#f4a300", "#111111", "#ffffff", 76, "Donbass Arena"],
    ["rbs", "RB Salzburg", "RBS", "Salzburg", "#f5f5f5", "#d71920", "#ffffff", 76, "Red Bull Arena"],
    ["bru", "Club Brugge", "BRU", "Bruges", "#1e4d9b", "#111111", "#ffffff", 75, "Jan Breydel"],
    ["oly", "Olympiacos", "OLY", "Pireu", "#d71920", "#f5f5f5", "#ffffff", 77, "Karaiskakis"],
    ["and", "Anderlecht", "AND", "Bruxelas", "#6b2d8f", "#f5f5f5", "#ffffff", 74, "Lotto Park"],
    ["bas", "Basel", "BAS", "Basileia", "#d71920", "#1e4d9b", "#ffffff", 74, "St. Jakob-Park"]
  ],
  selecoes: [
    ["bra", "Brasil", "BRA", "América do Sul", "#f4d03f", "#1a7a4a", "#1e4d9b", 90, "Maracanã"],
    ["arg", "Argentina", "ARG", "América do Sul", "#6cabdd", "#f5f5f5", "#f4d03f", 89, "Monumental"],
    ["fra", "França", "FRA", "Europa", "#1e4d9b", "#f5f5f5", "#d71920", 88, "Stade de France"],
    ["eng", "Inglaterra", "ENG", "Europa", "#f5f5f5", "#1c2c5b", "#d71920", 87, "Wembley"],
    ["esp", "Espanha", "ESP", "Europa", "#d71920", "#f4d03f", "#1e4d9b", 88, "La Cartuja"],
    ["por", "Portugal", "POR", "Europa", "#7a1c2e", "#1a7a4a", "#f4d03f", 86, "Estádio da Luz"],
    ["ale", "Alemanha", "ALE", "Europa", "#f5f5f5", "#111111", "#d71920", 87, "Allianz Arena"],
    ["ita", "Itália", "ITA", "Europa", "#1e4d9b", "#f5f5f5", "#1a7a4a", 85, "Olímpico"],
    ["hol", "Holanda", "HOL", "Europa", "#f4a300", "#1c2c5b", "#f5f5f5", 85, "Johan Cruyff"],
    ["bel", "Bélgica", "BEL", "Europa", "#d71920", "#f4d03f", "#111111", 84, "King Baudouin"],
    ["cro", "Croácia", "CRO", "Europa", "#f5f5f5", "#d71920", "#1e4d9b", 83, "Maksimir"],
    ["uru", "Uruguai", "URU", "América do Sul", "#6cabdd", "#f5f5f5", "#f4d03f", 84, "Centenário"],
    ["col", "Colômbia", "COL", "América do Sul", "#f4d03f", "#1e4d9b", "#d71920", 82, "Metropolitano"],
    ["mex", "México", "MEX", "América do Norte", "#1a7a4a", "#f5f5f5", "#d71920", 81, "Azteca"],
    ["jap", "Japão", "JAP", "Ásia", "#1e4d9b", "#f5f5f5", "#d71920", 80, "Saitama"],
    ["eua", "Estados Unidos", "EUA", "América do Norte", "#f5f5f5", "#1e4d9b", "#d71920", 80, "MetLife"]
  ]
};

const LEAGUE_META = [
  { id: "brasileirao", name: "Brasileirão Série A", short: "Brasileirão", region: "Brasil", color: "#22c55e", accent: "#facc15", format: "league" },
  { id: "premier", name: "Premier League", short: "Premier League", region: "Inglaterra", color: "#7c3aed", accent: "#38bdf8", format: "league" },
  { id: "laliga", name: "LaLiga", short: "LaLiga", region: "Espanha", color: "#ef4444", accent: "#facc15", format: "league" },
  { id: "seriea", name: "Serie A", short: "Serie A", region: "Itália", color: "#0ea5e9", accent: "#22c55e", format: "league" },
  { id: "bundesliga", name: "Bundesliga", short: "Bundesliga", region: "Alemanha", color: "#f59e0b", accent: "#111827", format: "league" },
  { id: "ligue1", name: "Ligue 1", short: "Ligue 1", region: "França", color: "#6366f1", accent: "#f43f5e", format: "league" },
  { id: "libertadores", name: "Copa Libertadores", short: "Libertadores", region: "América do Sul", color: "#16a34a", accent: "#facc15", format: "cup" },
  { id: "mundo", name: "Liga Internacional", short: "Internacional", region: "Mundo", color: "#06b6d4", accent: "#a855f7", format: "league" },
  { id: "selecoes", name: "Seleções", short: "Seleções", region: "Mundo", color: "#f43f5e", accent: "#22d3ee", format: "cup" }
];

const FIRST = {
  br: ["Lucas", "Gabriel", "Matheus", "Rafael", "Bruno", "Diego", "Thiago", "Vinícius", "João", "Pedro", "Felipe", "Gustavo", "Rodrigo", "André", "Caio", "Davi", "Enzo", "Murilo", "Nicolas", "Alex", "Léo", "Danilo", "Everton", "Alan", "Igor", "Yuri", "Wesley", "Jean", "Cleiton", "Marlon"],
  en: ["James", "Harry", "Jack", "Oliver", "Mason", "Callum", "Liam", "Ethan", "Ben", "Ryan", "Sam", "Lewis", "Josh", "Charlie", "Joe", "Elliot", "Tyler", "Reece", "Kai", "Aaron"],
  es: ["Sergio", "Álvaro", "Javier", "Pablo", "Diego", "Iker", "Marco", "Unai", "Aitor", "Mikel", "Raúl", "Adrián", "Hugo", "Nico", "Dani", "Bryan", "Aarón", "Rodri", "Manu", "Gonzalo"],
  it: ["Lorenzo", "Matteo", "Andrea", "Alessandro", "Davide", "Simone", "Federico", "Riccardo", "Gabriele", "Tommaso", "Marco", "Luca", "Nicolò", "Stefano", "Pietro", "Fabio", "Elia", "Samuele", "Dario", "Cristian"],
  de: ["Leon", "Lukas", "Jonas", "Finn", "Tim", "Nico", "Julian", "Felix", "Max", "Florian", "David", "Moritz", "Jan", "Erik", "Paul", "Jannik", "Timo", "Luca", "Benedikt", "Marvin"],
  fr: ["Lucas", "Hugo", "Léo", "Nathan", "Enzo", "Mathis", "Théo", "Antoine", "Jules", "Maxime", "Romain", "Kylian", "Adrien", "Yanis", "Noé", "Baptiste", "Clément", "Florian", "Quentin", "Malik"],
  sa: ["Juan", "Diego", "Santiago", "Matías", "Facundo", "Lautaro", "Nicolás", "Agustín", "Bruno", "Gonzalo", "Thiago", "Rodrigo", "Franco", "Joaquín", "Emiliano", "Gabriel", "Tomás", "Renato", "Cristian", "Andrés"],
  wd: ["Kenji", "Yuki", "Haruto", "Sota", "Ren", "Riku", "Kaito", "Daiki", "Takumi", "Hiro", "Aiden", "Cole", "Miles", "Noah", "Landon", "Tyler", "Ethan", "Chris", "Jordan", "Logan"]
};

const LAST = {
  br: ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Pereira", "Almeida", "Ferreira", "Rodrigues", "Gomes", "Martins", "Araújo", "Ribeiro", "Carvalho", "Barbosa", "Nascimento", "Mendes", "Rocha", "Dias", "Teixeira", "Moreira", "Cardoso", "Correia", "Nunes", "Monteiro", "Freitas", "Machado", "Ramos", "Azevedo"],
  en: ["Smith", "Johnson", "Williams", "Brown", "Taylor", "Wilson", "Walker", "Wright", "Robinson", "Clarke", "Baker", "Hall", "Evans", "Turner", "Cooper", "Ward", "Morgan", "Hughes", "Green", "Bennett"],
  es: ["García", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Ruiz", "Díaz", "Moreno", "Álvarez", "Romero", "Navarro", "Torres", "Iglesias", "Ortega", "Castillo", "Serrano", "Blanco", "Molina"],
  it: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Costa", "Giordano", "Mancini", "Rizzo", "Lombardi", "Moretti"],
  de: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Keller", "Wolf", "Neumann", "Braun", "Krüger", "Hartmann", "Lange", "Werner", "Krause", "Lehmann"],
  fr: ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel"],
  sa: ["González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "García", "Sánchez", "Romero", "Sosa", "Álvarez", "Benítez", "Torres", "Acosta", "Medina", "Herrera", "Silva", "Vargas", "Castro", "Rojas"],
  wd: ["Tanaka", "Sato", "Suzuki", "Takahashi", "Watanabe", "Ito", "Nakamura", "Kobayashi", "Yamamoto", "Kato", "Miller", "Davis", "Garcia", "Wilson", "Martinez", "Anderson", "Robinson", "Clark", "Lewis", "Young"]
};

const NAME_REGION = {
  brasileirao: "br",
  premier: "en",
  laliga: "es",
  seriea: "it",
  bundesliga: "de",
  ligue1: "fr",
  libertadores: "sa",
  mundo: "wd",
  selecoes: "wd"
};

const NATIONALITY = {
  brasileirao: "Brasil",
  premier: "Inglaterra",
  laliga: "Espanha",
  seriea: "Itália",
  bundesliga: "Alemanha",
  ligue1: "França",
  libertadores: "América do Sul",
  mundo: "Internacional",
  selecoes: "Internacional"
};

const POSITIONS = ["GOL", "ZAG", "ZAG", "LD", "LE", "VOL", "MC", "MC", "MEI", "PD", "PE", "ATA", "ATA", "ZAG", "VOL", "MEI", "PD", "ATA"];
const NUMBERS = [1, 3, 4, 2, 6, 5, 8, 10, 7, 11, 9, 13, 14, 15, 16, 17, 18, 19];

const hash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const buildTeam = (leagueId, row) => {
  const [slug, name, short, city, primary, secondary, accent, overall, stadium] = row;
  const id = `${leagueId}-${slug}`;
  const region = NAME_REGION[leagueId];
  const random = rng(hash(id));
  const squad = POSITIONS.map((position, index) => {
    const variance = Math.floor(random() * 11) - 5;
    const base = overall + variance + (index === 0 ? 1 : 0);
    const rating = clamp(base, 54, 96);
    const pace = clamp(rating + (["PD", "PE", "LD", "LE", "ATA"].includes(position) ? 5 : -3) + Math.floor(random() * 7) - 3, 45, 99);
    const shot = clamp(rating + (["ATA", "PD", "PE", "MEI"].includes(position) ? 5 : -8) + Math.floor(random() * 7) - 3, 35, 99);
    const pass = clamp(rating + (["MEI", "MC", "VOL"].includes(position) ? 5 : -2) + Math.floor(random() * 7) - 3, 40, 99);
    const dribble = clamp(rating + (["MEI", "PD", "PE", "ATA"].includes(position) ? 4 : -4) + Math.floor(random() * 7) - 3, 40, 99);
    const defense = clamp(rating + (["GOL", "ZAG", "VOL", "LD", "LE"].includes(position) ? 8 : -10) + Math.floor(random() * 7) - 3, 30, 99);
    const physical = clamp(rating + (["ZAG", "VOL", "ATA"].includes(position) ? 4 : -2) + Math.floor(random() * 7) - 3, 40, 99);
    const first = FIRST[region][Math.floor(random() * FIRST[region].length)];
    const last = LAST[region][Math.floor(random() * LAST[region].length)];
    const nameOut = `${first} ${last}`;
    const age = 18 + Math.floor(random() * 17);
    return {
      id: `${id}-p${index}`,
      name: nameOut,
      shortName: `${first[0]}. ${last}`,
      number: NUMBERS[index],
      position,
      overall: rating,
      pace,
      shot,
      pass,
      dribble,
      defense,
      physical,
      stamina: clamp(72 + rating / 4 + Math.floor(random() * 8), 70, 99),
      age,
      foot: random() > 0.24 ? "Direito" : "Esquerdo",
      nationality: NATIONALITY[leagueId],
      value: Math.round((rating ** 2) * (age < 24 ? 19 : age < 30 ? 14 : 8) / 100) * 1000,
      wage: Math.round(rating * (age < 24 ? 210 : 170)),
      form: 3 + Math.floor(random() * 4),
      goals: 0,
      assists: 0,
      apps: 0
    };
  });
  return {
    id,
    leagueId,
    name,
    short,
    city,
    primary,
    secondary,
    accent,
    overall,
    stadium,
    formation: overall > 84 ? "4-3-3" : "4-4-2",
    style: overall > 84 ? "Posse de bola" : overall > 79 ? "Transição rápida" : "Equilibrado",
    reputation: clamp(Math.round(overall - 38), 20, 60),
    squad
  };
};

export const LEAGUES = LEAGUE_META.map((meta) => ({
  ...meta,
  teams: TEAM_ROWS[meta.id].map((row) => buildTeam(meta.id, row))
}));

export const TEAM_INDEX = new Map();
LEAGUES.forEach((league) => {
  league.teams.forEach((team) => {
    team.leagueName = league.name;
    TEAM_INDEX.set(team.id, team);
  });
});

export const getTeam = (id) => TEAM_INDEX.get(id) || LEAGUES[0].teams[0];
export const getLeague = (id) => LEAGUES.find((league) => league.id === id) || LEAGUES[0];

export const COMPETITIONS = [
  { id: "BRASILEIRAO", name: "Brasileirão Série A", format: "league", leagueId: "brasileirao", color: "#22c55e", accent: "#facc15", prize: 18500, description: "38 rodadas de disputa pelo título nacional." },
  { id: "PREMIER", name: "Premier League", format: "league", leagueId: "premier", color: "#7c3aed", accent: "#38bdf8", prize: 22000, description: "O campeonato mais competitivo do planeta." },
  { id: "LALIGA", name: "LaLiga", format: "league", leagueId: "laliga", color: "#ef4444", accent: "#facc15", prize: 21000, description: "Técnica, posse de bola e grandes clássicos." },
  { id: "SERIEA", name: "Serie A", format: "league", leagueId: "seriea", color: "#0ea5e9", accent: "#22c55e", prize: 20000, description: "A escola italiana de defesa e estratégia." },
  { id: "BUNDESLIGA", name: "Bundesliga", format: "league", leagueId: "bundesliga", color: "#f59e0b", accent: "#111827", prize: 19500, description: "Intensidade, pressão alta e muitos gols." },
  { id: "LIGUE1", name: "Ligue 1", format: "league", leagueId: "ligue1", color: "#6366f1", accent: "#f43f5e", prize: 19000, description: "Velocidade e joias francesas em campo." },
  { id: "LIBERTADORES", name: "Copa Libertadores", format: "cup", leagueId: "libertadores", color: "#16a34a", accent: "#facc15", prize: 26000, description: "Glória eterna em mata-mata sul-americano." },
  { id: "CHAMPIONS", name: "Champions League", format: "cup", leagueId: "mundo", color: "#1d4ed8", accent: "#38bdf8", prize: 30000, description: "As maiores estrelas da Europa em duelo." },
  { id: "COPABRASIL", name: "Copa do Brasil", format: "cup", leagueId: "brasileirao", color: "#eab308", accent: "#16a34a", prize: 17000, description: "Mata-mata nacional com zebras históricas." },
  { id: "MUNDIAL", name: "Copa do Mundo", format: "cup", leagueId: "selecoes", color: "#f43f5e", accent: "#22d3ee", prize: 35000, description: "Seleções lendárias lutam pelo troféu supremo." }
];

export const getCompetition = (id) => COMPETITIONS.find((competition) => competition.id === id) || COMPETITIONS[0];

export const FORMATIONS = {
  "4-3-3": {
    name: "4-3-3 Ofensivo",
    slots: [[0.045, 0.5, "GOL"], [0.22, 0.16, "LD"], [0.2, 0.38, "ZAG"], [0.2, 0.62, "ZAG"], [0.22, 0.84, "LE"], [0.42, 0.5, "VOL"], [0.47, 0.28, "MC"], [0.47, 0.72, "MC"], [0.67, 0.18, "PD"], [0.69, 0.5, "ATA"], [0.67, 0.82, "PE"]]
  },
  "4-4-2": {
    name: "4-4-2 Clássico",
    slots: [[0.045, 0.5, "GOL"], [0.22, 0.16, "LD"], [0.2, 0.38, "ZAG"], [0.2, 0.62, "ZAG"], [0.22, 0.84, "LE"], [0.45, 0.16, "PD"], [0.43, 0.4, "MC"], [0.43, 0.6, "MC"], [0.45, 0.84, "PE"], [0.68, 0.38, "ATA"], [0.68, 0.62, "ATA"]]
  },
  "4-2-3-1": {
    name: "4-2-3-1 Equilibrado",
    slots: [[0.045, 0.5, "GOL"], [0.22, 0.16, "LD"], [0.2, 0.38, "ZAG"], [0.2, 0.62, "ZAG"], [0.22, 0.84, "LE"], [0.4, 0.38, "VOL"], [0.4, 0.62, "VOL"], [0.58, 0.2, "PD"], [0.56, 0.5, "MEI"], [0.58, 0.8, "PE"], [0.72, 0.5, "ATA"]]
  },
  "3-5-2": {
    name: "3-5-2 Pressão",
    slots: [[0.045, 0.5, "GOL"], [0.2, 0.28, "ZAG"], [0.18, 0.5, "ZAG"], [0.2, 0.72, "ZAG"], [0.44, 0.1, "LE"], [0.42, 0.34, "MC"], [0.4, 0.5, "VOL"], [0.42, 0.66, "MC"], [0.44, 0.9, "LD"], [0.68, 0.38, "ATA"], [0.68, 0.62, "ATA"]]
  }
};

export const STADIUMS = [
  { id: "maracana", name: "Maracanã", city: "Rio de Janeiro", capacity: 78838, atmosphere: 96, primary: "#1e4d9b", secondary: "#f4d03f", sky: "#0b1730" },
  { id: "allianz", name: "Allianz Parque", city: "São Paulo", capacity: 43713, atmosphere: 92, primary: "#0d5c32", secondary: "#f5f5f5", sky: "#0b1d26" },
  { id: "neoquimica", name: "Neo Química Arena", city: "São Paulo", capacity: 49205, atmosphere: 91, primary: "#1c1c1c", secondary: "#f0f0f0", sky: "#131313" },
  { id: "morumbi", name: "Morumbi", city: "São Paulo", capacity: 66795, atmosphere: 88, primary: "#d71920", secondary: "#111111", sky: "#121826" },
  { id: "engenhao", name: "Nilton Santos", city: "Rio de Janeiro", capacity: 44661, atmosphere: 84, primary: "#1a1a1a", secondary: "#d4d4d4", sky: "#10131c" },
  { id: "mineirao", name: "Mineirão", city: "Belo Horizonte", capacity: 61846, atmosphere: 89, primary: "#1e4d9b", secondary: "#f5f5f5", sky: "#0d1b2a" },
  { id: "arenaMRV", name: "Arena MRV", city: "Belo Horizonte", capacity: 46000, atmosphere: 87, primary: "#101010", secondary: "#f5f5f5", sky: "#141414" },
  { id: "beiraRio", name: "Beira-Rio", city: "Porto Alegre", capacity: 50128, atmosphere: 88, primary: "#c8102e", secondary: "#f5f5f5", sky: "#1c0b0f" },
  { id: "castelao", name: "Arena Castelão", city: "Fortaleza", capacity: 63903, atmosphere: 86, primary: "#1e4d9b", secondary: "#d71920", sky: "#0b1b26" },
  { id: "ligga", name: "Ligga Arena", city: "Curitiba", capacity: 42372, atmosphere: 83, primary: "#a3181f", secondary: "#111111", sky: "#1c0d0e" },
  { id: "emirates", name: "Emirates Stadium", city: "Londres", capacity: 60704, atmosphere: 90, primary: "#d71920", secondary: "#f5f5f5", sky: "#1a1a2e" },
  { id: "anfield", name: "Anfield", city: "Liverpool", capacity: 61276, atmosphere: 97, primary: "#c8102e", secondary: "#00a398", sky: "#160d10" },
  { id: "etihad", name: "Etihad Stadium", city: "Manchester", capacity: 53400, atmosphere: 88, primary: "#6cabdd", secondary: "#1c2c5b", sky: "#0d1b2a" },
  { id: "bernabeu", name: "Santiago Bernabéu", city: "Madri", capacity: 81044, atmosphere: 94, primary: "#f5f5f5", secondary: "#d4af37", sky: "#0f172a" },
  { id: "campnou", name: "Camp Nou", city: "Barcelona", capacity: 99354, atmosphere: 95, primary: "#1e4d9b", secondary: "#7a1c2e", sky: "#1a1026" },
  { id: "sansiro", name: "San Siro", city: "Milão", capacity: 75923, atmosphere: 93, primary: "#c8102e", secondary: "#111111", sky: "#120c14" },
  { id: "signal", name: "Signal Iduna Park", city: "Dortmund", capacity: 81365, atmosphere: 98, primary: "#f4d03f", secondary: "#111111", sky: "#1a1605" },
  { id: "parc", name: "Parc des Princes", city: "Paris", capacity: 48583, atmosphere: 89, primary: "#1c2c5b", secondary: "#d71920", sky: "#0b1024" },
  { id: "bombonera", name: "La Bombonera", city: "Buenos Aires", capacity: 54000, atmosphere: 99, primary: "#1e4d9b", secondary: "#f4d03f", sky: "#081226" },
  { id: "monumental", name: "Monumental", city: "Buenos Aires", capacity: 83214, atmosphere: 91, primary: "#f5f5f5", secondary: "#d71920", sky: "#1a0b0e" },
  { id: "centenario", name: "Centenário", city: "Montevidéu", capacity: 60235, atmosphere: 87, primary: "#6cabdd", secondary: "#f5f5f5", sky: "#0b1b2a" }
];

export const BALLS = [
  { id: "classic", name: "Clássico", primary: "#f8fafc", secondary: "#111827", accent: "#facc15", price: 0 },
  { id: "neon", name: "Neon", primary: "#eafffb", secondary: "#0f766e", accent: "#22d3ee", price: 850 },
  { id: "gold", name: "Ouro", primary: "#fef3c7", secondary: "#92400e", accent: "#fbbf24", price: 1600 },
  { id: "fire", name: "Fogo", primary: "#fff7ed", secondary: "#7f1d1d", accent: "#f97316", price: 2400 },
  { id: "ice", name: "Gelo", primary: "#f0f9ff", secondary: "#1e3a8a", accent: "#38bdf8", price: 3200 }
];

export const DIFFICULTIES = [
  { id: "amador", name: "Amador", speed: 0.8, reaction: 0.62, error: 0.34, reward: 0.7 },
  { id: "profissional", name: "Profissional", speed: 0.93, reaction: 0.78, error: 0.2, reward: 1 },
  { id: "lenda", name: "Lenda", speed: 1.05, reaction: 0.92, error: 0.09, reward: 1.4 },
  { id: "icone", name: "Ícone", speed: 1.14, reaction: 0.99, error: 0.035, reward: 1.8 }
];

export const WEATHERS = [
  { id: "clear", name: "Céu limpo", icon: "sol", speed: 1, friction: 1 },
  { id: "cloudy", name: "Nublado", icon: "nuvem", speed: 1, friction: 1 },
  { id: "rain", name: "Chuva", icon: "chuva", speed: 0.94, friction: 0.82 },
  { id: "night", name: "Noite", icon: "lua", speed: 1, friction: 1 },
  { id: "snow", name: "Neve", icon: "neve", speed: 0.9, friction: 0.7 }
];

export const CAMERAS = [
  { id: "broadcast", name: "Transmissão" },
  { id: "dynamic", name: "Dinâmica" },
  { id: "tactical", name: "Tática" },
  { id: "close", name: "Close" }
];

export const LOCKED_ITEMS = [
  { id: "ball-neon", name: "Bola Neon", price: 850, type: "ball", item: "neon" },
  { id: "ball-gold", name: "Bola Ouro", price: 1600, type: "ball", item: "gold" },
  { id: "ball-fire", name: "Bola Fogo", price: 2400, type: "ball", item: "fire" },
  { id: "ball-ice", name: "Bola Gelo", price: 3200, type: "ball", item: "ice" },
  { id: "kit-retro", name: "Kit Retrô 1997", price: 1200, type: "kit", item: "retro" },
  { id: "kit-night", name: "Kit Noite", price: 1800, type: "kit", item: "night" }
];

export const TROPHIES = [
  { id: "br", name: "Brasileirão", color: "#22c55e" },
  { id: "libertadores", name: "Libertadores", color: "#facc15" },
  { id: "champions", name: "Champions", color: "#38bdf8" },
  { id: "copa", name: "Copa do Brasil", color: "#f59e0b" },
  { id: "mundo", name: "Mundial", color: "#f43f5e" }
];

export const NEWS = [
  "Virada histórica no Maracanã agita a rodada do Brasileirão.",
  "Mercado: jovem atacante de 19 anos desperta interesse europeu.",
  "Técnico anuncia trio ofensivo para o clássico desta noite.",
  "Libertadores: grupos definidos e favoritos já sentem a pressão.",
  "Rumo ao Estrelato: nova geração brilha nos gramados sintéticos.",
  "Champions League terá transmissão exclusiva do PES 2027.",
  "Torcida prepara mosaico especial para a grande final.",
  "Editor de uniformes recebe novos escudos e padrões de tecido."
];

export const COMMENTARY = {
  kickoff: ["A bola rola no gramado! Começa a partida.", "Jogo iniciado, e a torcida faz a festa nas arquibancadas.", "Apito inicial! Está tudo pronto para o espetáculo."],
  pass: ["Boa saída de bola.", "Circula bem a equipe.", "Troca de passes precisa no meio-campo."],
  shot: ["Finalizou!", "Chutou com perigo!", "Arrisca de fora da área!"],
  goal: ["GOOOL! Que pintura!", "É gol! A torcida vai ao delírio!", "GOLAAÇO! Simplesmente espetacular!", "Bola no fundo das redes! Que jogada!"],
  save: ["Grande defesa do goleiro!", "Que intervenção! Salvou a equipe!", "O arqueiro estava atento e espalmou."],
  post: ["Na trave! Faltou muito pouco!", "O travessão salvou! Inacreditável!", "Explodiu na madeira!"],
  foul: ["Falta marcada pelo árbitro.", "Jogo faltoso no meio-campo.", "O juiz não deixou passar."],
  yellow: ["Cartão amarelo. Precisa ter calma.", "Advertido pelo árbitro.", "Amarelo justo pela entrada."],
  red: ["Cartão vermelho! Está expulso!", "Que prejuízo! A equipe fica com um a menos.", "Expulsão direta! O árbitro não perdoou."],
  corner: ["Escanteio! Boa oportunidade para a equipe.", "Cruzamento perigoso e a bola sai pela linha de fundo.", "Canto para a equipe visitante."],
  halftime: ["Fim do primeiro tempo. Vamos para o intervalo.", "Intervalo no estádio. Os técnicos ajustam as equipes."],
  fulltime: ["Fim de jogo! O apito final ecoa no estádio.", "Termina a partida! Confira as estatísticas e os destaques.", "Fim! Que espetáculo do futebol."],
  build: ["A equipe cresce no jogo.", "Pressão alta e a torcida empurra.", "Boa leitura tática do treinador."],
  tackle: ["Carrinho firme! Recuperou a posse.", "Desarme limpo no meio-campo.", "Que roubada de bola!"]
};

export const FIRST_NAMES = FIRST;
export const LAST_NAMES = LAST;
export const NAME_REGIONS = NAME_REGION;

export const seededValue = (seed) => {
  const random = rng(hash(seed));
  return random();
};
