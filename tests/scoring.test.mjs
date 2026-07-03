import assert from "node:assert/strict";
import test from "node:test";
import { scoreLead } from "../src/scoring.mjs";

test("scoreLead classifica alta prioridade quando site nao tem tracking e contato claro", () => {
  const lead = { url: "https://empresa.com.br" };
  const audit = {
    ok: true,
    loadMs: 6200,
    sizeKb: 800,
    signals: {
      hasMetaPixel: false,
      hasGtm: false,
      hasGa4: false,
      whatsappLinks: [],
      hasForms: false,
      hasHttps: true,
      instagramLinks: [],
      facebookLinks: [],
    },
  };

  const result = scoreLead(lead, audit);

  assert.equal(result.score >= 80, true);
  assert.equal(result.priority, "Prioridade maxima");
  assert.equal(result.opportunities.includes("Nao encontrei Pixel da Meta"), true);
});

test("scoreLead soma pontos para categoria de alto ticket sem site", () => {
  const lead = { url: "", category: "Imobiliaria" };
  const audit = {
    ok: false,
    loadMs: 0,
    sizeKb: 0,
    signals: {
      hasMetaPixel: false,
      hasGtm: false,
      hasGa4: false,
      hasGoogleAdsTag: false,
      whatsappLinks: [],
      hasForms: false,
      hasHttps: false,
      instagramLinks: [],
      facebookLinks: [],
    },
  };

  const result = scoreLead(lead, audit);

  // 25 (sem site) + 20 (categoria de alto ticket) = 45
  assert.equal(result.score, 45);
  assert.equal(result.opportunities.includes("Categoria de alto ticket com espaco para estrutura digital"), true);
});

test("scoreLead penaliza poucas avaliacoes e reconhece muitas avaliacoes sem tracking", () => {
  const baseSignals = {
    hasMetaPixel: false,
    hasGtm: false,
    hasGa4: false,
    hasGoogleAdsTag: false,
    whatsappLinks: ["https://wa.me/5511999999999"],
    hasForms: true,
    hasHttps: true,
    instagramLinks: ["https://instagram.com/empresa"],
    facebookLinks: [],
  };
  const audit = { ok: true, loadMs: 1000, sizeKb: 300, signals: baseSignals };

  const fewReviews = scoreLead({ url: "https://empresa.com.br", reviewCount: 3 }, audit);
  assert.equal(fewReviews.opportunities.includes("Poucas avaliacoes no perfil do negocio"), true);

  const manyReviewsNoTracking = scoreLead({ url: "https://empresa.com.br", reviewCount: 80 }, audit);
  assert.equal(manyReviewsNoTracking.opportunities.includes("Muitas avaliacoes mas sem estrutura de tracking"), true);
});
