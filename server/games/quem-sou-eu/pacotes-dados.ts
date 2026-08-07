import type { PacoteResumo } from '../../../shared/protocolo'

export interface PacoteCompleto extends PacoteResumo {
  cartas: string[]
}

export const PACOTES: PacoteCompleto[] = [
  {
    id: 'filmes',
    emoji: '🎥',
    nome: 'Filmes',
    descricao: 'Adivinhe os filmes mais famosos do cinema.',
    quantidade: 40,
    cartas: [
      'O Poderoso Chefão', 'O Senhor dos Anéis', 'Star Wars', 'De Volta Para o Futuro', 'Matrix', 
      'Pulp Fiction', 'Clube da Luta', 'Forrest Gump', 'Inception', 'Vingadores',
      'Titanic', 'Jurassic Park', 'E.T. O Extraterrestre', 'Tubarão', 'O Exterminador do Futuro',
      'Indiana Jones', 'Rocky', 'Harry Potter', 'Avatar', 'Gladiador',
      'A Origem', 'Interestelar', 'Batman: O Cavaleiro das Trevas', 'O Iluminado', 'Psicose',
      'Casablanca', 'Cidade de Deus', 'Tropa de Elite', 'O Auto da Compadecida', 'Central do Brasil',
      'O Silêncio dos Inocentes', 'Os Suspeitos', 'Seven', 'O Sexto Sentido', 'O Show de Truman',
      'Toy Story', 'O Rei Leão', 'Procurando Nemo', 'Shrek', 'Divertida Mente'
    ]
  },
  {
    id: 'anime',
    emoji: '⛩️',
    nome: 'Personagens de Anime',
    descricao: 'Personagens icônicos do mundo dos animes e mangás.',
    quantidade: 40,
    cartas: [
      'Goku', 'Naruto', 'Sasuke', 'Luffy', 'Zoro',
      'Ichigo', 'Edward Elric', 'Alphonse Elric', 'Levi Ackerman', 'Eren Yeager',
      'Mikasa', 'Saitama', 'Gohan', 'Vegeta', 'Kakashi',
      'Itachi', 'Jotaro', 'Dio', 'Gon', 'Killua',
      'Hisoka', 'Light Yagami', 'L', 'Lelouch', 'Spike Spiegel',
      'Shinji Ikari', 'Asuka', 'Rei Ayanami', 'Tanjiro', 'Nezuko',
      'Zenitsu', 'Inosuke', 'Gojo', 'Megumi', 'Nobara',
      'Yuji', 'Roronoa Zoro', 'Sanji', 'Nami', 'Nico Robin'
    ]
  },
  {
    id: 'personagens-filmes',
    emoji: '🍿',
    nome: 'Personagens de Filmes',
    descricao: 'Heróis, vilões e personagens inesquecíveis.',
    quantidade: 40,
    cartas: [
      'Darth Vader', 'Luke Skywalker', 'James Bond', 'Indiana Jones', 'Han Solo',
      'Harry Potter', 'Hermione Granger', 'Ron Weasley', 'Voldemort', 'Frodo Bolseiro',
      'Gandalf', 'Aragorn', 'Gollum', 'Jack Sparrow', 'Neo',
      'John Wick', 'Rocky Balboa', 'Rambo', 'Exterminador do Futuro', 'Marty McFly',
      'Doc Brown', 'Capitão América', 'Homem de Ferro', 'Thor', 'Viúva Negra',
      'Coringa', 'Batman', 'Mulher-Maravilha', 'Superman', 'Homem-Aranha',
      'Wolverine', 'Magneto', 'Professor X', 'Katniss Everdeen', 'John McClane',
      'Hannibal Lecter', 'Norman Bates', 'Kevin McCallister', 'Forrest Gump', 'Tyler Durden'
    ]
  },
  {
    id: 'livros',
    emoji: '📚',
    nome: 'Livros',
    descricao: 'Clássicos da literatura, best-sellers e romances.',
    quantidade: 40,
    cartas: [
      'Dom Quixote', '1984', 'O Pequeno Príncipe', 'Harry Potter', 'O Senhor dos Anéis',
      'O Hobbit', 'O Alquimista', 'Cem Anos de Solidão', 'A Revolução dos Bichos', 'Crime e Castigo',
      'A Metamorfose', 'Orgulho e Preconceito', 'O Morro dos Ventos Uivantes', 'Moby Dick', 'A Divina Comédia',
      'O Conde de Monte Cristo', 'Os Miseráveis', 'Frankenstein', 'Drácula', 'Alice no País das Maravilhas',
      'O Retrato de Dorian Gray', 'O Grande Gatsby', 'Admirável Mundo Novo', 'Fahrenheit 451', 'O Apanhador no Campo de Centeio',
      'A Menina que Roubava Livros', 'O Código Da Vinci', 'Anjos e Demônios', 'A Guerra dos Tronos', 'O Nome do Vento',
      'Duna', 'Fundação', 'Eu, Robô', 'O Guia do Mochileiro das Galáxias', 'Jogos Vorazes',
      'Crepúsculo', 'Percy Jackson', 'Dom Casmurro', 'Memórias Póstumas de Brás Cubas', 'O Cortiço'
    ]
  },
  {
    id: 'futebol',
    emoji: '⚽',
    nome: 'Jogadores de Futebol',
    descricao: 'Lendas do passado e craques da atualidade.',
    quantidade: 40,
    cartas: [
      'Pelé', 'Maradona', 'Messi', 'Cristiano Ronaldo', 'Neymar',
      'Ronaldinho Gaúcho', 'Ronaldo Fenômeno', 'Zidane', 'Romário', 'Zico',
      'Rivellino', 'Garrincha', 'Sócrates', 'Taffarel', 'Cafu',
      'Roberto Carlos', 'Kaká', 'Adriano Imperador', 'Vini Jr.', 'Rodrygo',
      'Mbappé', 'Haaland', 'De Bruyne', 'Salah', 'Lewandowski',
      'Modric', 'Kroos', 'Iniesta', 'Xavi', 'Sergio Ramos',
      'Puyol', 'Maldini', 'Buffon', 'Neuer', 'Casillas',
      'Cruyff', 'Beckenbauer', 'Platini', 'Di Stéfano', 'Puskás'
    ]
  },
  {
    id: 'jogos',
    emoji: '🎮',
    nome: 'Jogos',
    descricao: 'Títulos clássicos e sucessos modernos.',
    quantidade: 40,
    cartas: [
      'Super Mario World', 'Sonic the Hedgehog', 'The Legend of Zelda', 'Minecraft', 'Grand Theft Auto V',
      'Tetris', 'Pac-Man', 'Street Fighter II', 'Mortal Kombat', 'Call of Duty',
      'Counter-Strike', 'League of Legends', 'Dota 2', 'World of Warcraft', 'Overwatch',
      'Valorant', 'Fortnite', 'PUBG', 'Free Fire', 'Roblox',
      'The Sims', 'Red Dead Redemption 2', 'The Witcher 3', 'Skyrim', 'Dark Souls',
      'Elden Ring', 'God of War', 'The Last of Us', 'Uncharted', 'Resident Evil',
      'Silent Hill', 'Metal Gear Solid', 'Final Fantasy VII', 'Pokémon Red/Blue', 'Super Smash Bros',
      'Mario Kart 8', 'Animal Crossing', 'Hollow Knight', 'Hades', 'Celeste'
    ]
  },
  {
    id: 'personagens-jogos',
    emoji: '👾',
    nome: 'Personagens de Jogos',
    descricao: 'Protagonistas e vilões marcantes dos games.',
    quantidade: 40,
    cartas: [
      'Mario', 'Luigi', 'Bowser', 'Peach', 'Sonic',
      'Tails', 'Knuckles', 'Eggman', 'Link', 'Zelda',
      'Ganon', 'Pikachu', 'Charizard', 'Mewtwo', 'Samus Aran',
      'Donkey Kong', 'Kirby', 'Master Chief', 'Kratos', 'Geralt de Rivia',
      'Lara Croft', 'Nathan Drake', 'Joel', 'Ellie', 'Solid Snake',
      'Cloud Strife', 'Sephiroth', 'Sub-Zero', 'Scorpion', 'Ryu',
      'Ken', 'Chun-Li', 'Arthur Morgan', 'John Marston', 'Doomguy',
      'Gordon Freeman', 'GLaDOS', 'Steve', 'Tracer', 'Jinx'
    ]
  },
  {
    id: 'series',
    emoji: '📺',
    nome: 'Séries de TV',
    descricao: 'Shows que marcaram época e séries atuais.',
    quantidade: 40,
    cartas: [
      'Breaking Bad', 'Game of Thrones', 'Stranger Things', 'Friends', 'The Office',
      'How I Met Your Mother', 'Seinfeld', 'The Simpsons', 'South Park', 'Rick and Morty',
      'Peaky Blinders', 'The Boys', 'Black Mirror', 'Dark', 'La Casa de Papel',
      'Round 6', 'Narcos', 'House', 'Grey\'s Anatomy', 'Supernatural',
      'The Walking Dead', 'Lost', 'Prison Break', 'Dexter', 'True Detective',
      'Fargo', 'Better Call Saul', 'Succession', 'The Last of Us', 'The Mandalorian',
      'WandaVision', 'Loki', 'The Crown', 'Bridgerton', 'Euphoria',
      'Chaves', 'Chapolin', 'A Grande Família', 'Os Normais', 'Tapas & Beijos'
    ]
  },
  {
    id: 'musica',
    emoji: '🎤',
    nome: 'Cantores/Bandas',
    descricao: 'Ídolos da música, bandas e lendas do rock.',
    quantidade: 40,
    cartas: [
      'Michael Jackson', 'Elvis Presley', 'Freddie Mercury', 'Madonna', 'Beyoncé',
      'Taylor Swift', 'Justin Bieber', 'Ed Sheeran', 'Adele', 'Lady Gaga',
      'Rihanna', 'Katy Perry', 'Bruno Mars', 'Eminem', 'Snoop Dogg',
      'Tupac', 'The Beatles', 'Rolling Stones', 'Queen', 'Nirvana',
      'Metallica', 'AC/DC', 'Pink Floyd', 'Led Zeppelin', 'Guns N\' Roses',
      'Red Hot Chili Peppers', 'Coldplay', 'U2', 'Linkin Park', 'Green Day',
      'Roberto Carlos', 'Caetano Veloso', 'Gilberto Gil', 'Chico Buarque', 'Tim Maia',
      'Jorge Ben Jor', 'Legião Urbana', 'Charlie Brown Jr.', 'Skank', 'Titãs'
    ]
  },
  {
    id: 'super-herois',
    emoji: '🦸‍♂️',
    nome: 'Super-heróis',
    descricao: 'Heróis da Marvel, DC e outros universos.',
    quantidade: 40,
    cartas: [
      'Homem-Aranha', 'Batman', 'Superman', 'Mulher-Maravilha', 'Capitão América',
      'Homem de Ferro', 'Thor', 'Hulk', 'Viúva Negra', 'Gavião Arqueiro',
      'Pantera Negra', 'Doutor Estranho', 'Feiticeira Escarlate', 'Visão', 'Homem-Formiga',
      'Vespa', 'Senhor das Estrelas', 'Gamora', 'Drax', 'Rocket Raccoon',
      'Groot', 'Wolverine', 'Ciclope', 'Jean Grey', 'Tempestade',
      'Vampira', 'Noturno', 'Fera', 'Flash', 'Aquaman',
      'Lanterna Verde', 'Ciborgue', 'Arqueiro Verde', 'Caçador de Marte', 'Shazam',
      'Asa Noturna', 'Batgirl', 'Supergirl', 'Demolidor', 'Justiceiro'
    ]
  }
]
