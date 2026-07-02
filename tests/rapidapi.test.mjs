import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlace } from "../src/collectors/rapidapi-google-maps.mjs";

test("normalizePlace converte formatos comuns de place para CSV interno", () => {
  const result = normalizePlace({
    name: "Imobiliaria Modelo",
    website: "https://modelo.com.br",
    international_phone_number: "+55 65 99999-9999",
    rating: 4.8,
    user_ratings_total: 120,
    formatted_address: "Cuiaba, MT",
  }, {
    city: "Cuiaba",
    niche: "imobiliarias",
    source: "rapidapi-test",
  });

  assert.equal(result.nome_empresa, "Imobiliaria Modelo");
  assert.equal(result.site, "https://modelo.com.br");
  assert.equal(result.telefone, "+55 65 99999-9999");
  assert.equal(result.cidade, "Cuiaba");
  assert.equal(result.fonte, "rapidapi-test");
  assert.match(result.observacoes, /rating=4.8/);
});
