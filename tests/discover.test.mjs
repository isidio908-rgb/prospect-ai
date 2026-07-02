import assert from "node:assert/strict";
import test from "node:test";
import { extractLeadsFromHtml } from "../src/discover.mjs";

test("extractLeadsFromHtml extrai sites de empresas e ignora redes sociais", () => {
  const html = `
    <a href="https://empresa-a.com.br">Empresa A</a>
    <a href="https://instagram.com/empresa-a">Instagram</a>
    <a href="/contato">Contato interno</a>
  `;

  const leads = extractLeadsFromHtml(html, {
    baseUrl: "https://diretorio.com.br/imobiliarias",
    city: "Cuiaba",
    niche: "imobiliarias",
    category: "Imobiliaria",
    source: "teste",
  });

  assert.equal(leads.length, 1);
  assert.equal(leads[0].nome_empresa, "Empresa A");
  assert.equal(leads[0].cidade, "Cuiaba");
});
