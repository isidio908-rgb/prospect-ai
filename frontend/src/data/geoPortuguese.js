// Dados geográficos dos países de língua portuguesa (lusófonos).
// Estrutura: cada país tem `gl` (código de região para as APIs de busca),
// e uma lista de estados/regiões, cada uma com suas cidades principais.
//
// Brasil traz a lista completa de estados e principais cidades.
// Os demais países trazem as divisões administrativas de 1º nível
// (distritos/províncias/ilhas) e suas cidades/capitais principais.

const BR_CIDADES = {
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasiléia', 'Senador Guiomard', 'Plácido de Castro'],
  AL: ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo', 'União dos Palmares', 'Coruripe', 'Delmiro Gouveia', 'Marechal Deodoro'],
  AM: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga', 'Maués', 'Humaitá', 'Iranduba'],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande', 'Tartarugalzinho'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas', 'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Simões Filho', 'Paulo Afonso'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá', 'Aquiraz'],
  DF: ['Brasília', 'Ceilândia', 'Taguatinga', 'Gama', 'Samambaia', 'Planaltina', 'Sobradinho', 'Recanto das Emas', 'Guará', 'Águas Claras'],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim', 'Linhares', 'Colatina', 'Guarapari', 'São Mateus', 'Aracruz'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama', 'Catalão', 'Itumbiara', 'Caldas Novas'],
  MA: ['São Luís', 'Imperatriz', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas', 'Santa Inês'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Poços de Caldas', 'Pouso Alegre', 'Patos de Minas', 'Barbacena', 'Varginha'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Aquidauana', 'Sidrolândia', 'Maracaju'],
  MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Primavera do Leste', 'Barra do Garças', 'Alta Floresta'],
  PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba', 'Cametá', 'Marituba', 'Bragança', 'Altamira', 'Tucuruí'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras', 'Cabedelo', 'Guarabira', 'Sapé'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão', 'Igarassu'],
  PI: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras', 'Uruçuí', 'São Raimundo Nonato'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo'],
  RJ: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'São João de Meriti', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda', 'Magé', 'Macaé', 'Cabo Frio', 'Angra dos Reis', 'Nova Friburgo', 'Teresópolis'],
  RN: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim', 'Caicó', 'Açu', 'Currais Novos', 'Santa Cruz'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Guajará-Mirim', 'Pimenta Bueno'],
  RR: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Mucajaí', 'Cantá', 'Pacaraima', 'Alto Alegre', 'Bonfim'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Passo Fundo', 'Bento Gonçalves', 'Bagé', 'Uruguaiana', 'Santa Cruz do Sul', 'Cachoeirinha'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Criciúma', 'Chapecó', 'Itajaí', 'Jaraguá do Sul', 'Lages', 'Palhoça', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'Camboriú'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão', 'Estância', 'Tobias Barreto', 'Simão Dias', 'Propriá'],
  SP: ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Santos', 'Mauá', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Jundiaí', 'Piracicaba', 'Carapicuíba', 'Bauru', 'Franca', 'Praia Grande', 'Taubaté', 'Limeira', 'Suzano', 'São Vicente', 'Barueri'],
  TO: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins', 'Tocantinópolis', 'Guaraí', 'Dianópolis'],
};

const BR_ESTADOS = [
  { uf: 'AC', nome: 'Acre' }, { uf: 'AL', nome: 'Alagoas' }, { uf: 'AM', nome: 'Amazonas' },
  { uf: 'AP', nome: 'Amapá' }, { uf: 'BA', nome: 'Bahia' }, { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' }, { uf: 'ES', nome: 'Espírito Santo' }, { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' }, { uf: 'MG', nome: 'Minas Gerais' }, { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MT', nome: 'Mato Grosso' }, { uf: 'PA', nome: 'Pará' }, { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PE', nome: 'Pernambuco' }, { uf: 'PI', nome: 'Piauí' }, { uf: 'PR', nome: 'Paraná' },
  { uf: 'RJ', nome: 'Rio de Janeiro' }, { uf: 'RN', nome: 'Rio Grande do Norte' }, { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' }, { uf: 'RS', nome: 'Rio Grande do Sul' }, { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SE', nome: 'Sergipe' }, { uf: 'SP', nome: 'São Paulo' }, { uf: 'TO', nome: 'Tocantins' },
];

export const COUNTRIES = [
  {
    code: 'BR',
    name: 'Brasil',
    gl: 'br',
    states: BR_ESTADOS.map((e) => ({ uf: e.uf, nome: e.nome, cidades: BR_CIDADES[e.uf] || [] })),
  },
  {
    code: 'PT',
    name: 'Portugal',
    gl: 'pt',
    states: [
      { uf: 'LIS', nome: 'Lisboa', cidades: ['Lisboa', 'Sintra', 'Loures', 'Amadora', 'Cascais', 'Oeiras', 'Odivelas', 'Vila Franca de Xira'] },
      { uf: 'POR', nome: 'Porto', cidades: ['Porto', 'Vila Nova de Gaia', 'Matosinhos', 'Gondomar', 'Maia', 'Póvoa de Varzim', 'Valongo'] },
      { uf: 'BRG', nome: 'Braga', cidades: ['Braga', 'Guimarães', 'Barcelos', 'Vila Nova de Famalicão', 'Fafe'] },
      { uf: 'AVE', nome: 'Aveiro', cidades: ['Aveiro', 'Santa Maria da Feira', 'Águeda', 'Ílhavo', 'Ovar'] },
      { uf: 'COI', nome: 'Coimbra', cidades: ['Coimbra', 'Figueira da Foz', 'Cantanhede', 'Montemor-o-Velho'] },
      { uf: 'SET', nome: 'Setúbal', cidades: ['Setúbal', 'Almada', 'Barreiro', 'Seixal', 'Montijo', 'Palmela'] },
      { uf: 'FAR', nome: 'Faro (Algarve)', cidades: ['Faro', 'Portimão', 'Loulé', 'Albufeira', 'Lagos', 'Olhão'] },
      { uf: 'LEI', nome: 'Leiria', cidades: ['Leiria', 'Marinha Grande', 'Caldas da Rainha', 'Pombal', 'Alcobaça'] },
      { uf: 'VIS', nome: 'Viseu', cidades: ['Viseu', 'Lamego', 'Mangualde', 'Tondela'] },
      { uf: 'MAD', nome: 'Madeira', cidades: ['Funchal', 'Câmara de Lobos', 'Machico', 'Santa Cruz'] },
      { uf: 'ACO', nome: 'Açores', cidades: ['Ponta Delgada', 'Angra do Heroísmo', 'Ribeira Grande', 'Horta'] },
    ],
  },
  {
    code: 'AO',
    name: 'Angola',
    gl: 'ao',
    states: [
      { uf: 'LUA', nome: 'Luanda', cidades: ['Luanda', 'Cacuaco', 'Viana', 'Cazenga', 'Belas'] },
      { uf: 'BEN', nome: 'Benguela', cidades: ['Benguela', 'Lobito', 'Catumbela', 'Baía Farta'] },
      { uf: 'HUI', nome: 'Huíla', cidades: ['Lubango', 'Matala', 'Caluquembe'] },
      { uf: 'HUA', nome: 'Huambo', cidades: ['Huambo', 'Caála', 'Bailundo'] },
      { uf: 'CAB', nome: 'Cabinda', cidades: ['Cabinda', 'Cacongo'] },
      { uf: 'BIE', nome: 'Bié', cidades: ['Cuito', 'Andulo'] },
      { uf: 'NAM', nome: 'Namibe', cidades: ['Moçâmedes', 'Tômbwa'] },
    ],
  },
  {
    code: 'MZ',
    name: 'Moçambique',
    gl: 'mz',
    states: [
      { uf: 'MPT', nome: 'Maputo (Cidade)', cidades: ['Maputo'] },
      { uf: 'MPP', nome: 'Maputo (Província)', cidades: ['Matola', 'Boane', 'Namaacha', 'Manhiça'] },
      { uf: 'SOF', nome: 'Sofala', cidades: ['Beira', 'Dondo', 'Nhamatanda'] },
      { uf: 'NAM', nome: 'Nampula', cidades: ['Nampula', 'Nacala', 'Angoche'] },
      { uf: 'ZAM', nome: 'Zambézia', cidades: ['Quelimane', 'Mocuba', 'Gurué'] },
      { uf: 'TET', nome: 'Tete', cidades: ['Tete', 'Moatize'] },
      { uf: 'GAZ', nome: 'Gaza', cidades: ['Xai-Xai', 'Chókwè'] },
      { uf: 'INH', nome: 'Inhambane', cidades: ['Inhambane', 'Maxixe'] },
    ],
  },
  {
    code: 'CV',
    name: 'Cabo Verde',
    gl: 'cv',
    states: [
      { uf: 'PRA', nome: 'Santiago', cidades: ['Praia', 'Assomada', 'Tarrafal', 'Pedra Badejo'] },
      { uf: 'SVI', nome: 'São Vicente', cidades: ['Mindelo'] },
      { uf: 'SAL', nome: 'Sal', cidades: ['Espargos', 'Santa Maria'] },
      { uf: 'BOA', nome: 'Boa Vista', cidades: ['Sal Rei'] },
      { uf: 'SAN', nome: 'Santo Antão', cidades: ['Porto Novo', 'Ribeira Grande'] },
      { uf: 'FOG', nome: 'Fogo', cidades: ['São Filipe'] },
    ],
  },
];
