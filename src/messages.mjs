export function buildOutreachMessage(lead, score) {
  const company = lead.companyName || "sua empresa";
  const city = lead.city ? ` em ${lead.city}` : "";
  const topProblems = score.opportunities.slice(0, 3);

  if (!topProblems.length) {
    return `Ola, tudo bem? Estava analisando empresas${city} e vi a ${company}. A presenca digital de voces ja tem alguns pontos bons, mas acredito que ainda da para melhorar a geracao de oportunidades pelo Google, site e WhatsApp. Posso te enviar um diagnostico rapido do que eu encontrei?`;
  }

  return `Ola, tudo bem? Estava analisando empresas${city} e vi a ${company}. Encontrei alguns pontos que podem estar fazendo voces perderem oportunidades no digital: ${topProblems.join("; ")}. Posso te enviar um diagnostico rapido, sem compromisso, mostrando o que encontrei?`;
}

export function buildDiagnosis(lead, audit, score) {
  const company = lead.companyName || "Empresa";
  const intro = `${company} recebeu score ${score.score}/100 (${score.priority}).`;
  const opportunities = score.opportunities.length
    ? `Oportunidades: ${score.opportunities.join("; ")}.`
    : "Nao encontrei falhas criticas na primeira analise.";
  const strengths = score.strengths.length
    ? `Pontos positivos: ${score.strengths.join("; ")}.`
    : "Poucos pontos positivos detectados automaticamente.";

  return `${intro} ${opportunities} ${strengths} Status do site: ${audit.ok ? "online" : audit.error}.`;
}
