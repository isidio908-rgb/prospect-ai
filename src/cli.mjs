import { analyzeLeads } from "./runner.mjs";
import { discoverLeads } from "./discover.mjs";
import { collectFromRapidApi } from "./collectors/rapidapi-google-maps.mjs";

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? "help";

if (command === "analyze") {
  if (!args.input) {
    console.error("Informe --input data/inputs/seus-leads.csv");
    process.exit(1);
  }

  const result = await analyzeLeads({
    input: args.input,
    outputDir: args.outputDir,
    city: args.city,
    niche: args.niche,
    limit: args.limit,
  });

  console.log("");
  console.log(`Analise concluida: ${result.total} leads`);
  console.log(`Prioridade alta/maxima: ${result.highPriority}`);
  console.log(`CSV: ${result.csvPath}`);
  console.log(`JSON: ${result.jsonPath}`);
} else if (command === "discover") {
  try {
    const result = await discoverLeads({
      url: args.url,
      html: args.html,
      outputDir: args.outputDir,
      city: args.city,
      niche: args.niche,
      category: args.category,
    });

    console.log("");
    console.log(`Descoberta concluida: ${result.total} leads`);
    console.log(`CSV de entrada: ${result.outputPath}`);
    console.log("");
    console.log("Proximo passo:");
    console.log(`npm run analyze -- --input ${result.outputPath} --city "${args.city ?? ""}" --niche "${args.niche ?? ""}"`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
} else if (command === "collect") {
  try {
    const result = await collectFromRapidApi({
      query: args.query,
      city: args.city,
      niche: args.niche,
      limit: args.limit,
      outputDir: args.outputDir,
      provider: args.provider,
      rapidapiKey: args.rapidapiKey,
      rapidapiHost: args.rapidapiHost,
      searchUrl: args.searchUrl,
      dailyLimit: args.dailyLimit,
      lat: args.lat,
      lng: args.lng,
      zoom: args.zoom,
      region: args.region,
      language: args.language,
      extractEmailsAndContacts: args.extractEmailsAndContacts,
    });

    console.log("");
    console.log(`Coleta concluida: ${result.total} leads`);
    console.log(`Provider: ${result.provider}`);
    console.log(`Cota registrada hoje: ${result.usedToday}/${result.dailyLimit}`);
    console.log(`CSV de entrada: ${result.outputPath}`);
    console.log("");
    console.log("Proximo passo:");
    console.log(`npm run analyze -- --input ${result.outputPath} --city "${args.city ?? ""}" --niche "${args.niche ?? ""}"`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log(`Prospect AI

Comandos:
  npm run collect -- --query "imobiliarias em Cuiaba, MT" --city "Cuiaba" --niche "imobiliarias" --lat -15.6014 --lng -56.0979 --zoom 13 --region br --language pt --extractEmailsAndContacts false --limit 20
  npm run analyze -- --input data/inputs/example-leads.csv --city Cuiaba --niche imobiliarias
  npm run discover -- --url https://diretorio-publico.com/categoria --city Cuiaba --niche imobiliarias
  npm run discover -- --html data/inputs/pagina-salva.html --city Cuiaba --niche imobiliarias
  npm run demo

Parametros do collect (Local Business Data):
  --query         termo de busca, ex: "imobiliarias em Cuiaba, MT"
  --city          cidade (fallback quando a API nao retornar city)
  --niche         nicho do lead
  --limit         quantidade de resultados (padrao 20)
  --lat           latitude do centro da busca (obrigatorio se o template usar {lat})
  --lng           longitude do centro da busca (obrigatorio se o template usar {lng})
  --zoom          nivel de aproximacao (padrao 13)
  --region        pais/regiao (padrao br)
  --language      idioma da resposta (padrao pt)
  --extractEmailsAndContacts  true/false (padrao false)

Formato do CSV de entrada:
  nome_empresa,site,telefone,cidade,nicho,categoria,fonte,observacoes
`);
}

function parseArgs(values) {
  const parsed = { _: [] };

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];

    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = values[i + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
}
