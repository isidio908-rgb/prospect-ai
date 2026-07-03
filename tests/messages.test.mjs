import assert from "node:assert/strict";
import test from "node:test";
import { buildDiagnosis, buildFollowUpMessage, buildOutreachMessage } from "../src/messages.mjs";
import { normalizeLead } from "../src/extractors.mjs";

test("buildOutreachMessage usa o nome da empresa mesmo vindo do formato ja normalizado (companyName)", () => {
  // Regressao: analyzer.mjs monta o objeto com companyName/url antes de
  // normalizeLead, e o nome nao pode se perder nesse caminho.
  const lead = normalizeLead({ companyName: "Imobiliaria Teste", city: "Cuiaba" });
  const score = { opportunities: ["Nao possui site informado"], strengths: [] };

  const message = buildOutreachMessage(lead, score);

  assert.match(message, /Imobiliaria Teste/);
  assert.doesNotMatch(message, /sua empresa/);
});

test("buildFollowUpMessage lista os problemas de forma numerada", () => {
  const lead = normalizeLead({ nome_empresa: "Empresa X" });
  const score = {
    opportunities: ["Nao possui site informado", "Nao encontrei Pixel da Meta"],
    strengths: [],
  };

  const message = buildFollowUpMessage(lead, score);

  assert.match(message, /1\. Nao possui site informado/);
  assert.match(message, /2\. Nao encontrei Pixel da Meta/);
});

test("buildDiagnosis usa tom comercial (sem citar Pixel/GTM/GA4 isolados)", () => {
  const lead = normalizeLead({ nome_empresa: "Empresa Y", site: "https://empresay.com.br" });
  const audit = { ok: true, error: "" };
  const score = {
    score: 50,
    priority: "Media",
    opportunities: ["Nao encontrei Pixel da Meta", "Nao encontrei GA4"],
    strengths: [],
  };

  const diagnosis = buildDiagnosis(lead, audit, score);

  assert.match(diagnosis, /Empresa Y/);
  assert.doesNotMatch(diagnosis, /Pixel da Meta/);
  assert.doesNotMatch(diagnosis, /GA4/);
});

test("buildDiagnosis identifica lead sem site", () => {
  const lead = normalizeLead({ nome_empresa: "Empresa Sem Site" });
  const audit = { ok: false, error: "Lead sem site informado" };
  const score = { score: 25, priority: "Baixa", opportunities: ["Nao possui site informado"], strengths: [] };

  const diagnosis = buildDiagnosis(lead, audit, score);

  assert.match(diagnosis, /nao possui site cadastrado/);
});
