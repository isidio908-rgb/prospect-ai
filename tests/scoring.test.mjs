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
